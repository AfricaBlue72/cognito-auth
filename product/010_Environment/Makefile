# Makefile for deploying S3 Buckets CloudFormation stack

# Variables
TEMPLATE_FILE := cognito-auth-buckets.yaml
CFDEPLOY_SCRIPT := ../../cicd/scripts/cfdeploy
REGION := eu-west-1
PRODUCT_NAME ?= cognito-auth

# Default target
.PHONY: deploy
deploy:
	@echo "Deploying $(STACK_NAME) stack..."
	@$(CFDEPLOY_SCRIPT)  $(TEMPLATE_FILE) --region $(REGION) \
		--parameter ProductName=$(PRODUCT_NAME) --force

# Clean up target (optional, implement if needed)
.PHONY: clean
clean:
	@echo "Cleaning up stack..."
	# Add cleanup commands if necessary

# Help target
.PHONY: help
help:
	@echo "Available targets:"
	@echo "  deploy  - Deploy the stack"
	@echo "  clean   - Clean up resources (if implemented)"
	@echo "  help    - Show this help message"
