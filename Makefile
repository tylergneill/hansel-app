LOCAL_DATA_PATH = $(shell realpath $(dir $(lastword $(MAKEFILE_LIST)))../hansel-data)
# (or export LOCAL_DATA_PATH env var if different from above)

# for temporary local builds with full data
run:
	docker build . -t hansel-dev:debug
	docker run \
	  --rm \
	  -it \
	  -p 5030:5030 \
	  -v $(LOCAL_DATA_PATH):/app/static/data \
	  hansel-dev:debug

# for official stg and prod builds uploaded to Docker Hub
# to use: VERSION={version} make run-official
run-official:
	docker run \
	  --rm \
	  -it \
	  -p 5030:5030 \
	  -v $(LOCAL_DATA_PATH):/app/static/data \
	  tylergneill/hansel-app:$(VERSION)
