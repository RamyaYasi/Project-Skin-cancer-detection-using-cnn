document.addEventListener('DOMContentLoaded', function() {
    const uploadArea = document.getElementById('uploadArea');
    const imageInput = document.getElementById('imageInput');
    const previewSection = document.getElementById('previewSection');
    const previewImage = document.getElementById('previewImage');
    const removeImageBtn = document.getElementById('removeImage');
    const predictBtn = document.getElementById('predictBtn');
    const resultsSection = document.getElementById('resultsSection');
    const errorMessage = document.getElementById('errorMessage');
    const analyzeAnotherBtn = document.getElementById('analyzeAnother');

    // File input change
    imageInput.addEventListener('change', function(e) {
        handleFile(e.target.files[0]);
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleFile(file);
        } else {
            showError('Please drop a valid image file.');
        }
    });

    // Click to upload
    uploadArea.addEventListener('click', function() {
        imageInput.click();
    });

    // Remove image
    removeImageBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        resetUpload();
    });

    // Predict button
    predictBtn.addEventListener('click', function() {
        const file = imageInput.files[0];
        if (file) {
            predictImage(file);
        }
    });

    // Analyze another
    analyzeAnotherBtn.addEventListener('click', function() {
        resetUpload();
    });

    function handleFile(file) {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showError('Please select a valid image file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            previewImage.src = e.target.result;
            uploadArea.style.display = 'none';
            previewSection.style.display = 'block';
            hideError();
        };
        reader.readAsDataURL(file);
    }

    function predictImage(file) {
        const formData = new FormData();
        formData.append('image', file);

        // Show loading state
        const btnText = predictBtn.querySelector('.btn-text');
        const btnLoader = predictBtn.querySelector('.btn-loader');
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-block';
        predictBtn.disabled = true;
        hideError();
        resultsSection.style.display = 'none';

        fetch('/predict', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showError(data.error);
            } else {
                displayResults(data);
            }
        })
        .catch(error => {
            showError('An error occurred while processing your image. Please try again.');
            console.error('Error:', error);
        })
        .finally(() => {
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
            predictBtn.disabled = false;
        });
    }

    function displayResults(data) {
        const predictedClass = document.getElementById('predictedClass');
        const confidenceBadge = document.getElementById('confidenceBadge');
        const probabilitiesList = document.getElementById('probabilitiesList');

        // Display predicted class
        predictedClass.textContent = formatLabel(data.predicted_class);
        
        // Display confidence
        const maxProb = Math.max(...Object.values(data.probabilities));
        confidenceBadge.textContent = `${(maxProb * 100).toFixed(1)}% Confidence`;

        // Display probabilities
        probabilitiesList.innerHTML = '';
        const sortedProbs = Object.entries(data.probabilities)
            .sort((a, b) => b[1] - a[1]);

        sortedProbs.forEach(([label, prob]) => {
            const item = document.createElement('div');
            item.className = 'probability-item';
            
            const labelSpan = document.createElement('span');
            labelSpan.className = 'probability-label';
            labelSpan.textContent = formatLabel(label);

            const barContainer = document.createElement('div');
            barContainer.className = 'probability-bar-container';
            
            const bar = document.createElement('div');
            bar.className = 'probability-bar';
            bar.style.width = '0%';
            
            setTimeout(() => {
                bar.style.width = `${prob * 100}%`;
            }, 100);

            barContainer.appendChild(bar);

            const valueSpan = document.createElement('span');
            valueSpan.className = 'probability-value';
            valueSpan.textContent = `${(prob * 100).toFixed(2)}%`;

            item.appendChild(labelSpan);
            item.appendChild(barContainer);
            item.appendChild(valueSpan);
            probabilitiesList.appendChild(item);
        });

        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function formatLabel(label) {
        return label
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    function resetUpload() {
        imageInput.value = '';
        uploadArea.style.display = 'block';
        previewSection.style.display = 'none';
        resultsSection.style.display = 'none';
        hideError();
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }

    function hideError() {
        errorMessage.style.display = 'none';
    }
});

