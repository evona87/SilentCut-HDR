# SilentCut-HDR: Restriction Enzyme Marker Designer
SilentCut-HDR is a straightforward web application designed to accelerate the screening process for CRISPR Homology Directed Repair (HDR) experiments. It automatically calculates all possible synonymous (silent) mutations within a given target sequence and identifies which of those silent changes will introduce a novel Restriction Enzyme (RE) recognition site. The application's core value is suggesting the ideal Restriction Enzyme site change within the target sequence, enabling researchers to quickly confirm successful gene integration using a simple, cost-effective RE digest of bulk-edited cells. Developed in Python, the application uses FastAPI for its web interface and relies on the robust functionality of Biopython for all sequence and enzyme calculations.

# Installation
This application is built using Python 3.8+, FastAPI, and Biopython. We highly recommend using a virtual environment (venv) to keep dependencies isolated. Follow these four steps to get the application running on your local machine:

1. Clone the repository from GitHub
   
```
git clone [https://github.com/evona87/SilentCut-HDR.git](https://github.com/evona87/SilentCut-HDR.git)
cd SilentCut-HDR
```
2. Create and activate a Python virtual environment. This ensures dependencies don't interfere with other Python projects. (optional)

```
python3 -m venv venv
source venv/bin/activate  # Use 'venv\Scripts\activate' on Windows
```

3. Install all required dependencies
We install FastAPI (the framework), uvicorn (the ASGI server), and Biopython (for sequence analysis).
```
pip install fastapi uvicorn 'biopython[full]' pydantic python-multipart 'fastapi-utils'
```

4. Start the FastAPI server. This command runs the uvicorn server, pointing it to the 'app' object inside the 'backend.py' file and reloading every time a change is made.
```
uvicorn backend:app --reload
```

