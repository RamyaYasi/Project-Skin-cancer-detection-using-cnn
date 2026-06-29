from flask import Flask, request, jsonify, render_template
import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import numpy as np
import io
import os

# ---------------------------------------------------
# INIT FLASK
# ---------------------------------------------------
app = Flask(__name__)

# ---------------------------------------------------
# DEVICE
# ---------------------------------------------------
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# ---------------------------------------------------
# LOAD LABELS
# ---------------------------------------------------
try:
    train_labels = np.load("train_labels.npy")
    unique_labels = np.unique(train_labels)
    idx_to_label = {i: unique_labels[i] for i in range(len(unique_labels))}
    num_classes = len(unique_labels)
except FileNotFoundError:
    # Fallback if labels file doesn't exist
    print("Warning: train_labels.npy not found. Using default labels.")
    unique_labels = np.array(['melanoma', 'nevus', 'seborrheic_keratosis'])
    idx_to_label = {i: unique_labels[i] for i in range(len(unique_labels))}
    num_classes = len(unique_labels)

# ---------------------------------------------------
# REBUILD RESNET
# ---------------------------------------------------
resnet = models.resnet18(pretrained=False)
resnet.conv1 = nn.Conv2d(3, 64, kernel_size=7, stride=2, padding=3, bias=False)
resnet.fc = nn.Linear(resnet.fc.in_features, num_classes)
resnet = resnet.to(device)
resnet.eval()

# ---------------------------------------------------
# REBUILD MOBILENET
# ---------------------------------------------------
mobilenet = models.mobilenet_v2(pretrained=False)
mobilenet.classifier[1] = nn.Linear(mobilenet.last_channel, num_classes)
mobilenet = mobilenet.to(device)
mobilenet.eval()

# ---------------------------------------------------
# LOAD CHECKPOINT
# ---------------------------------------------------
try:
    checkpoint = torch.load("ensemble_trained.pth", map_location=device)
    resnet.load_state_dict(checkpoint["resnet"])
    mobilenet.load_state_dict(checkpoint["mobilenet"])
    print("✔ Ensemble Models Loaded Successfully!")
except FileNotFoundError:
    print("Warning: ensemble_trained.pth not found. Model will use random weights.")

# ---------------------------------------------------
# TRANSFORMS
# ---------------------------------------------------
transform = transforms.Compose([
    transforms.Resize((64, 64)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])
])


# ---------------------------------------------------
# PREDICT FUNCTION
# ---------------------------------------------------
def predict_image(pil_img):
    img_tensor = transform(pil_img).unsqueeze(0).to(device)

    with torch.no_grad():
        res_logits = resnet(img_tensor)
        mob_logits = mobilenet(img_tensor)

        final_logits = (res_logits + mob_logits) / 2

        probabilities = torch.softmax(final_logits, dim=1)[0].cpu().numpy()
        pred_idx = int(np.argmax(probabilities))
        pred_label = str(idx_to_label[pred_idx])

    prob_dict = {str(idx_to_label[i]): float(probabilities[i]) for i in range(len(probabilities))}
    return pred_label, prob_dict


# ---------------------------------------------------
# FLASK ROUTES
# ---------------------------------------------------
@app.route("/")
def home():
    return render_template("index.html")

@app.route("/predict-page")
def predict_page():
    return render_template("predict.html")

@app.route("/about")
def about():
    return render_template("about.html")

@app.route("/contact")
def contact():
    return render_template("contact.html")

@app.route("/predict", methods=["POST"])
def predict():
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400

    file = request.files["image"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    try:
        img_bytes = file.read()
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

        pred_label, prob_dict = predict_image(img)

        return jsonify({
            "predicted_class": pred_label,
            "probabilities": prob_dict
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/contact", methods=["POST"])
def contact_submit():
    data = request.get_json()
    # Here you can add email sending logic or database storage
    return jsonify({"message": "Thank you for your message! We'll get back to you soon."})


# ---------------------------------------------------
# RUN SERVER
# ---------------------------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
