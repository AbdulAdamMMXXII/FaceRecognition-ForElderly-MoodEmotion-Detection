#!/bin/bash
# Download face-api models to public/models directory

echo "📥 Downloading face-api models..."

mkdir -p public/models

# Model file URLs and names
declare -a FILES=(
    "https://unpkg.com/@vladmandic/face-api@1.7.0/model/tiny_face_detector_model-weights_manifest.json"
    "https://unpkg.com/@vladmandic/face-api@1.7.0/model/tiny_face_detector_model-shard1.bin"
    "https://unpkg.com/@vladmandic/face-api@1.7.0/model/face_expression_model-weights_manifest.json"
    "https://unpkg.com/@vladmandic/face-api@1.7.0/model/face_expression_model-shard1.bin"
)

for file_url in "${FILES[@]}"; do
    filename=$(basename "$file_url")
    echo "Downloading $filename..."
    curl -fsSL "$file_url" -o "public/models/$filename"
    if [ $? -eq 0 ]; then
        echo "✓ Downloaded $filename"
    else
        echo "✗ Failed to download $filename"
        exit 1
    fi
done

echo "✅ All models downloaded successfully to public/models/"
echo ""
echo "To use local models, update src/app/services/moodAnalyzer.ts:"
echo "Change: const MODEL_URL = 'https://...'"
echo "To:     const MODEL_URL = '/models/'"
