# HANSEL: Human-Accessible and NLP-ready Sanskrit E-text Library

A companion project to the now-defunct GRETIL.

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

1.  First, find the app version by inspecting the `VERSION` file. (Dev: Designate a new version tag.)
2.  Next, export the version as an environment variable. For example:
    ```bash
    export VERSION=0.0.0
    ```
3.  The HANSEL app requires a local clone of the `hansel-data` repository. You must set the `LOCAL_DATA_PATH` environment variable to the absolute path of your local `hansel-data` clone. For example:
    ```bash
    export LOCAL_DATA_PATH=/Users/tyler/Git/hansel/hansel-data
    ```
4. (Dev: Build the image using `docker build . -t tylergneill/hansel-app:{version}`. If using a different image name, adjust in `Makefile` as well.) 
5. Then, you can run the app using the `make run` command, which uses Docker.
    ```bash
    make run
    ```
5.  Open your browser and navigate to `http://localhost:5030`.


## Project Structure

```
├── flask_app.py           # Main Flask application
├── templates/             # HTML templates
│   ├── index.html         # Main landing page
│   ├── table.html         # Alternative landing page
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

## Data

The Sanskrit e-texts and their corresponding metadata are located in the `static/data` directory.

The data in this repo is dummy data, for basic local testing purposes.
When the app runs with Docker, it mounts a different file location to this path,
effectively overwriting the dummy data in the container.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.
More simply, write an email to `hello` at `hansel-library.info`. 

## License

This project is licensed under the terms of the LICENSE file.
