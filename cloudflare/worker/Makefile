PWD := $(shell pwd)
WRANGLER := npx wrangler

.PHONY: dev deploy-staging deploy-prod secret-staging secret-prod dry-run

dev:
	$(WRANGLER) dev

# Deploy the staging Worker (targets the staging Vercel origin).
# Requires: npx wrangler secret put ORIGIN_URL --env staging
deploy-staging:
	$(WRANGLER) deploy --env staging

# Deploy the production Worker (default environment, targets the prod Vercel origin).
# Requires: npx wrangler secret put ORIGIN_URL
deploy-prod:
	$(WRANGLER) deploy

secret-staging:
	$(WRANGLER) secret put ORIGIN_URL --env staging

secret-prod:
	$(WRANGLER) secret put ORIGIN_URL

# Validate the bundle and config without deploying.
dry-run:
	$(WRANGLER) deploy --dry-run --outdir dist/
