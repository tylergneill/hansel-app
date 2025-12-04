LOCAL_DATA_PATH = $(shell realpath $(dir $(lastword $(MAKEFILE_LIST)))../hansel-data)
# (or export LOCAL_DATA_PATH env var if different from above)

# for temporary local builds with full data
run:
	docker build . -f Dockerfile.stg -t  hansel-dev:debug
	docker run \
	  --rm \
	  -it \
	  -p 5031:5031 \
	  -v $(LOCAL_DATA_PATH):/app/static/data \
	  --name hansel-dev \
	  hansel-dev:debug

# for official prod and stg builds uploaded to Docker Hub

# to use: VERSION={version} make run-official where {version} does NOT end in -dev# or -rc#
run-official:
	docker run \
	  --rm \
	  -it \
	  -p 5030:5030 \
	  -v $(LOCAL_DATA_PATH):/app/static/data \
	  tylergneill/hansel-app:$(VERSION)

# to use: VERSION={version} make run-official-stg where {version} does end in -dev# or -rc#
run-official-stg:
	docker run \
	  --rm \
	  -it \
	  -p 5031:5031 \
	  -v $(LOCAL_DATA_PATH):/app/static/data \
	  tylergneill/hansel-app:$(VERSION)
