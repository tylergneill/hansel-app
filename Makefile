# local, first export variables
run:
	docker run \
	  --rm \
	  -it \
	  --platform linux/amd64 \
	  -p 5030:5030 \
	  -v $(LOCAL_DATA_PATH):/app/static/data \
	  tylergneill/hansel-app:$(VERSION)