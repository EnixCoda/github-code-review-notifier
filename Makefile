GIT_SHA=$(shell git rev-parse HEAD)
VERSION=$(GIT_SHA)

release:
	echo "Got version ${VERSION}"
	yarn sentry-cli releases new "${VERSION}"
	# Commit Integration
	# yarn sentry-cli releases set-commits --auto ${VERSION}
	yarn sentry-cli releases set-commits ${VERSION} --commit "EnixCoda/github-code-review-notifier@${GIT_SHA}"
	# Emitting sourcemap
	# yarn sentry-cli releases files "${VERSION}" upload-sourcemaps dist --no-rewrite
	yarn sentry-cli releases finalize "${VERSION}"
