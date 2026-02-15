# EduSynth AI: Topic Research, Summarizer & Explainer (GitHub Pages)

## Project Overview
This project is a web-based learning assistant developed as part of the Problem Based Learning (PBL) course.
It is implemented as a **fully static website** so it can be hosted directly on **GitHub Pages**.

The system allows a user to enter any academic topic and generates:

- A short summary  
- A detailed explanation in simple language  
- Key bullet points for quick revision  
- A short conclusion useful for exams  

The goal is to reduce the time students spend searching multiple sources and help them quickly understand important concepts.

---

## Problem Statement
Students often struggle to understand new topics because information is scattered across different websites, videos, and books.  
Manual searching and note-making takes a lot of time and effort.

There is a need for a simple AI-based tool that can **research, summarize, and explain any topic instantly** in a student-friendly manner.

---

## Objective
The main objectives of this project are:

- To build a web application that accepts a topic as input  
- To use Artificial Intelligence to generate meaningful study content  
- To present the information in a clear and structured format  
- To help students in quick learning and exam revision  

---

## Methodology
The working of the system follows these steps:

1. User enters a topic in the Live Demo section  
2. If a Gemini API key is provided, the browser calls the **Google Gemini API** directly (no backend) to generate:
   - Research-style summary
   - Simple explanation
   - Key points
   - Conclusion
3. If no API key is provided (or the live call fails), the site loads an offline sample output so the demo never shows a blank page.

---

## Features
- Simple and clean academic user interface  
- Topic-based AI research and summarization  
- Easy-to-read explanation for beginners  
- Quick revision bullet points  
- Fast response using modern AI models  

---

## Technology Stack

### Frontend
- HTML
- CSS
- JavaScript

### AI Integration (optional)
- Google Gemini API (called from the browser when you paste your own key)

---

## How to Run the Project

### Local
Open `index.html` in a browser.

### GitHub Pages
1. Push this repository to GitHub.
2. In repository settings: Pages -> Build and deployment -> Deploy from a branch -> `main` / `(root)`.
3. Open the published Pages URL.

### Live AI Output
In the "Live demo" section, paste your Gemini API key and click "Generate notes".
If you enable "Remember key", it is stored in your browser's localStorage (never committed to the repo).
