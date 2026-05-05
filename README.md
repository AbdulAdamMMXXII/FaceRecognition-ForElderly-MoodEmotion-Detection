# Elderly Mood/Emotion Well-Being Monitoring System

## Overview
This project is an ongoing Final Year Project (FYP) for the BSc Computer Science programme at Birmingham City University (BCU). It focuses on designing and developing a cloud-based artificial intelligence system that uses facial recognition and emotion detection to monitor the emotional well-being of elderly individuals.

The system combines computer vision, machine learning and cloud-native architectures to identify individuals, classify emotional states, and analyse long-term behavioural trends while addressing ethical and privacy considerations.

## Project Objectives
- Design a scalable AI system for facial recognition and emotion detection
- Compare and evaluate deep learning models for face recognition and facial emotion recognition
- Implement a cloud-based processing pipeline for real-time inference
- Store and analyse emotional data securely for long-term trend analysis
- Explore ethical, privacy, and data protection challenges in biometric systems

## Key Features
- Face detection and recognition using deep learning models (e.g. FaceNet, ArcFace)
- Mood and emotion classification using CNN-based or AutoML models
- Cloud-native architecture using serverless computing
- Real-time data storage and long-term analytics
- Caregiver monitoring through a web-based dashboard (planned)

## Technologies Used
- **Programming Language:** Python
- **Computer Vision:** OpenCV
- **Machine Learning:** TensorFlow / PyTorch
- **Cloud Platform:** Google Cloud Platform (GCP)
  - Vision AI
  - AutoML Vision
  - Cloud Functions
  - Firestore
  - BigQuery
- **Frontend (Planned):** React
- **Databases:** Firestore (real-time), BigQuery (analytics)

## System Architecture (High-Level)
1. Camera captures an image or video frame
2. Image is securely sent to a cloud function
3. AI services perform face detection and emotion classification
4. Results are stored in cloud databases
5. Analytics engine monitors trends and triggers alerts
6. Dashboard displays real-time and historical insights

## Project Status
This project is **currently in development**.  
Core research, system design and literature review have been completed.  
Implementation, testing and evaluation are ongoing.  
**Project structure**  
 cmd: tree -L 4 -I "node_modules"                
.  
├── ATTRIBUTIONS.md  
├── FACE_API_SETUP.md  
├── FUNCTIONAL_SUMMARY.md  
├── README.md  
├── SETUP_COMPLETE.md  
├── VSCODE_GUIDE.md  
├── apphosting.emulator.yaml  
├── dist  
│   ├── assets  
│   │   ├── index-Cdl-89jI.js  
│   │   └── index-DKFy34bx.css  
│   ├── index.html  
│   └── models  
│       ├── face_expression_model-weights_manifest.json  
│       ├── face_expression_model.bin  
│       ├── tiny_face_detector_model-weights_manifest.json  
│       └── tiny_face_detector_model.bin  
├── download-models.js  
├── download-models.sh  
├── firebase.json  
├── firestore-debug.log  
├── firestore.indexes.json  
├── firestore.rules  
├── guidelines  
│   └── Guidelines.md  
├── index.html  
├── package-lock.json  
├── package.json  
├── postcss.config.mjs  
├── public  
│   ├── index.html  
│   └── models  
│       ├── face_expression_model-weights_manifest.json  
│       ├── face_expression_model.bin  
│       ├── tiny_face_detector_model-weights_manifest.json  
│       └── tiny_face_detector_model.bin  
├── src  
│   ├── app  
│   │   ├── App.tsx  
│   │   ├── components  
│   │   │   ├── Layout.tsx  
│   │   │   ├── ProtectedRoute.tsx  
│   │   │   ├── figma  
│   │   │   └── ui  
│   │   ├── contexts  
│   │   │   └── AuthContext.tsx  
│   │   ├── pages  
│   │   │   ├── Alerts.tsx  
│   │   │   ├── Analytics.tsx  
│   │   │   ├── Dashboard.tsx  
│   │   │   ├── Login.tsx  
│   │   │   ├── MoodDetection.tsx  
│   │   │   ├── Profile.tsx  
│   │   │   ├── Reports.tsx  
│   │   │   └── SignUp.tsx  
│   │   ├── routes.tsx  
│   │   ├── services  
│   │   │   ├── firestore.ts  
│   │   │   └── moodAnalyzer.ts  
│   │   ├── types  
│   │   │   └── faceapi.d.ts  
│   │   ├── types.ts  
│   │   └── utils  
│   │       └── moodUtils.ts  
│   ├── firebase.ts  
│   ├── main.tsx  
│   └── styles  
│       ├── fonts.css  
│       ├── index.css  
│       ├── tailwind.css  
│       └── theme.css  
└── vite.config.ts  
  
18 directories, 55 files  

## Ethical Considerations
- No raw facial images are permanently stored
- Data is anonymised and processed securely in the cloud
- GDPR principles are considered throughout system design
- The project follows BCU ethical research guidelines

## Author
**Abdulrazig Adam**  
BSc Computer Science | FYP
Birmingham City University  

## Disclaimer
This repository represents academic work in progress and is intended for educational and research purposes only.
