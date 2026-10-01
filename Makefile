.DEFAULT_GOAL := help
.NOTPARALLEL:
ENGINE ?= $(shell command -v docker >/dev/null 2>&1 && echo docker || echo podman)
IMAGE ?= gosu-json-dev:node24
PROJECT_DIR := $(CURDIR)
HOST_UID := $(shell id -u)
HOST_GID := $(shell id -g)
USER_NAMESPACE := $(if $(findstring podman,$(notdir $(ENGINE))),--userns=keep-id,)
RUN = $(ENGINE) run --rm $(USER_NAMESPACE) --user $(HOST_UID):$(HOST_GID) --mount 'type=bind,source=$(PROJECT_DIR),target=/workspace' $(IMAGE)

.PHONY: help image all install test build check format format-check package versions
help:
	@printf '%s\n' 'GOSU JSON — project-local container tools' '' 'make all           Install, test, build, check, format-check and package' 'make install       Install locked dependencies' 'make test          Run unit tests (run install first)' 'make build         Build browser extensions (run install first)' 'make check         Check generated manifests and syntax' 'make format        Format source and documentation' 'make format-check  Check formatting' 'make package       Create ZIP files from existing dist/' 'make versions      Show container Node, npm and Python versions' '' 'Requires Make and Docker or Podman. No host Node/npm/Python required.' 'Select an engine explicitly: make all ENGINE=podman'
image:
	@command -v $(ENGINE) >/dev/null 2>&1 || { printf '%s\n' 'Install Docker or Podman, then run make all again.'; exit 1; }
	$(ENGINE) build --file Dockerfile.dev --tag $(IMAGE) .
all: image
	$(RUN) sh -ec 'npm install --package-lock-only --ignore-scripts && npm ci && npm test && npm run build && npm run check && npm run format:check && npm run package'
install: image
	$(RUN) sh -ec 'npm install --package-lock-only --ignore-scripts && npm ci'
test: image
	$(RUN) npm test
build: image
	$(RUN) npm run build
check: image
	$(RUN) npm run check
format: image
	$(RUN) npm run format
format-check: image
	$(RUN) npm run format:check
package: image
	$(RUN) npm run package
versions: image
	$(RUN) sh -ec 'node --version; npm --version; python3 --version'
