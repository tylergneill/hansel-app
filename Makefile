# for local run with full data
# first export both environment variables
# make sure building and running for correct platform
run:
	docker run \
	  --rm \
	  -it \
	  -p 5030:5030 \
	  -v $(LOCAL_DATA_PATH):/app/static/data \
	  tylergneill/hansel-app:$(VERSION)