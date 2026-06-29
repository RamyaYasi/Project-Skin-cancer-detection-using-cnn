# -------------------------------
# Base Image
# -------------------------------
FROM python:3.10-slim

# -------------------------------
# Environment Variables

# -------------------------------
# Set Working Directory
# -------------------------------
WORKDIR /app

# -------------------------------
# Install System Dependencies


# -------------------------------
# Copy Requirements & Install
# -------------------------------
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# -------------------------------
# Copy Application Code
# -------------------------------
COPY . .

# -------------------------------
# Expose Flask Port
# -------------------------------
EXPOSE 5000

# -------------------------------
# Run Flask App
# -------------------------------
CMD ["python", "app.py"]
