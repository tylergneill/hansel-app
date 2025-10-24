# for local run with full data
# first, build image for correct platform
# second, ensure corresponding VERSION env var is exported
LOCAL_DATA_PATH = $(shell realpath $(dir $(lastword $(MAKEFILE_LIST)))../hansel-data)
# third, export LOCAL_DATA_PATH env (only if different from above)

run:
	docker run \
	  --rm \
	  -it \
	  -p 5030:5030 \
	  -v $(LOCAL_DATA_PATH):/app/static/data \
	  hansel:$(VERSION)