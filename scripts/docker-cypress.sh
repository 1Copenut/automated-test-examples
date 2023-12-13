#!/bin/bash

DOCKER_IMAGE_URL=YOUR_IMAGE_URL

docker run -it --rm -v "$PWD":/app "$DOCKER_IMAGE" bash -c 'npm run cypress:ci'
