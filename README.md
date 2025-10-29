# HANSEL: Human-Accessible and NLP-ready Sanskrit E-text Library

A companion project to GRETIL.

HANSEL is a Sanskrit e-text library. 
It is also a website giving access to that library. 

This repo contains code for the website. 
[Another repo](https://github.com/tylergneill/hansel-data) contains the library data and code.

## Deployments

Production web app: [hansel-library.info](https://hansel-library.info)

Dev/Staging web app: [hansel-stg.duckdns.org/](https://hansel-stg.duckdns.org/) (password-protected)

## Website Features

*   **Browse** a collection of Sanskrit e-texts, including with metadata filters.
*   **View complete metadata** for each text.
*   **Download** texts and metadata in various formats.
*   **Access multiple versions** of the texts.
*   **Collaborate** by reading documentation and getting in touch.

# Dev Instructions

For those who want to work on code for the HANSEL web app.

## Getting Started

### Prerequisites

*   Python 3.x
*   Flask
*   Docker (optional)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/tylergneil/hansel-app.git
    ```
2.  Install the dependencies:
    ```bash
    pip install -r requirements.txt
    ```

### Running the Application

#### Without Docker

This uses the app repo's dummy data.

1.  Run the Flask development server:
    ```bash
    ./launch.sh
    ```
2.  Open your browser and navigate to `http://localhost:5030`.

#### With Docker

This uses the complete data in the data repo.

1.  Export environment variables:
    ```bash
    export IMG_NAME=tylergneill/hansel-app
    export VERSION=0.4.0
    ```
2. The `Makefile` expects a local clone of the full `hansel-data` repository at `../hansel-data`. You can override this path by exporting another variable. For example:
    ```bash
    export LOCAL_DATA_PATH=/Users/tyler/Git/hansel-data
    ```
3. Build the image using `docker build . -t $IMG_NAME:$VERSION`.
4. Run with the `Makefile`:
    ```bash
    make run
    ```
5.  Open browser and navigate to `http://localhost:5030`.


## Project Structure

```
├── flask_app.py           # Main Flask application
├── templates/             # HTML templates
│   ├── index.html         # Main landing page
│   ├── about.html         # About page
│   └── ...
├── static/                # Static assets
│   ├── data/              # Sanskrit e-texts and metadata (dummy/mount)
│   ├── web/               # CSS, JavaScript, and images
│   └── ...
├── utils.py               # Utility functions
├── requirements.txt       # Python dependencies
├── Dockerfile             # Docker configuration
└── ...
```


# Contributing

Contributions are welcome! Use the contact form on [hansel-library.info](https://hansel-library.info). 


## License

This project is licensed under the terms of the LICENSE file.
