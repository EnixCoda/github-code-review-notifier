.PHONY: dev deploy-staging deploy-prod dry-run

WRANGLER := npx wrangler

dev:
	$(WRANGLER) dev

# Deploy the preview/staging Worker (bound to test.enix.one, ORIGIN_URL var).
deploy-staging:
	$(WRANGLER) deploy --env staging

# Deploy the production Worker (bound to github-code-review-notifier.enix.one, ORIGIN_URL var).
deploy-prod:
	$(WRANGLER) deploy

# Validate the bundle and config without deploying.
dry-run:
	$(WRANGLER) deploy --dry-run --outdir dist/
