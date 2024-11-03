# Makefile for deploying S3 Buckets CloudFormation stack

# Variables
USER_POOL_STACK := cognito-auth-user-pool.yaml
USER_POOL_CLIENTS_STACK := cognito-auth-clients.yaml
CFDEPLOY_SCRIPT := ../../cicd/scripts/cfdeploy
REGION := eu-west-1
PRODUCT_NAME ?= cognito-auth

# Default target
.PHONY: deploy
deploy:
	@echo "Deploying $(USER_POOL_STACK) stack..."
	@$(CFDEPLOY_SCRIPT)  $(USER_POOL_STACK) --region $(REGION) \
		--parameter ProductName=$(PRODUCT_NAME) --force
		
	@echo "Deploying $(USER_POOL_CLIENTS_STACK) stack..."
	@$(CFDEPLOY_SCRIPT)  $(USER_POOL_CLIENTS_STACK) --region $(REGION) \
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
