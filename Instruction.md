Full-Stack Developer Task — Remotion Captioning Platform


🎯 Goal
Build a hosted full-stack web application that allows users to upload an .mp4 video, automatically generate captions for the audio, and render those captions onto the video using Remotion.
Unlike the internship version, this project must be deployed live (on Vercel, Render, or any preferred hosting platform**). Share the final hosted link and the GitHub repository with complete setup instructions.

⚙️ Core Requirements (Mandatory)
1. Remotion Integration
Use Remotion (remotion.dev) to overlay captions on top of uploaded videos.
 The app should be able to render the final video using Remotion’s rendering pipeline.
2. Video Upload
Provide a clean UI that allows users to upload any .mp4 file from their device.
3. Auto-Captioning
Include a button: “Auto-generate captions”.


This should run speech-to-text (STT) on the uploaded video and return captions in text form.


You may use OpenAI Whisper API, AssemblyAI, or any other STT model of your choice.


Document the exact solution used (API or local model) and how it was integrated.


4. Hinglish Support
Ensure captions render correctly for mixed Hindi (Devanagari script) and English text.
Use appropriate fonts such as Noto Sans and Noto Sans Devanagari.


Text alignment, encoding, and rendering must be verified for mixed-language sentences.


5. Caption Style Presets (2–3 styles)
Implement at least 2–3 predefined caption styles, for example:
Bottom-centered subtitles (standard)


Top-bar captions (news-style)


Karaoke-style highlighting


The user should be able to select a preset from the UI, and captions should appear in that style.
6. Preview & Export
Provide a real-time video preview with captions using Remotion Player or an equivalent setup.


Allow users to export the final captioned video as an .mp4 OR provide a clear CLI render command for developers.


7. Deployment
The project must be hosted live on any platform (e.g., Vercel, Render, or Netlify).


Share a publicly accessible link where the application can be tested end-to-end.



📦 Deliverables
Hosted app link (Vercel/Render/Netlify)


GitHub repository containing:


Complete source code


README.md with:


Node.js version and setup steps


Commands to run locally


Details of the caption generation method


Instructions for hosting/deployment


At least one sample video and its captioned output (exported MP4) included in the repo or linked externally.



💡 Nice-to-Have / Bonus (Optional)
Use offline Whisper (whisper.cpp or local model inference).


Add support for importing/exporting caption files (SRT/VTT).


Implement word-level karaoke highlighting (if simple).


Modular, production-ready architecture using TypeScript, Docker, or Next.js API routes.


Clean UI/UX with responsive design.


🔍 Evaluation Criteria
We’ll evaluate submissions based on:
Functional correctness and reliability


Caption accuracy and Hinglish rendering quality


Code clarity, modularity, and documentation


UI/UX quality and ease of use


Deployment and performance


Bonus: Offline/advanced features


🧾 Submission
Submit the following:
Live app URL


GitHub repository link


Short Loom/video walkthrough (optional but preferred) explaining your approach and architecture.



