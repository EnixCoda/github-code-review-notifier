GIT_SHA=$(shell git rev-parse HEAD)

release:
	echo "Got version ${GIT_SHA}"
	# sentry
	yarn sentry-cli releases new "${GIT_SHA}"
	yarn sentry-cli releases set-commits --auto ${GIT_SHA}
	# Emitting sourcemap
	# yarn sentry-cli releases files "${GIT_SHA}" upload-sourcemaps dist --no-rewrite
	yarn sentry-cli releases finalize "${GIT_SHA}"

