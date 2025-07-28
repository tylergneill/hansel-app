#!/bin/bash
export FLASK_APP=flask_app.py
export FLASK_DEBUG=1
export DATA_PATH="../hansel-data"
flask run -p 5030