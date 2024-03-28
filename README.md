# Interview Challenge - Answer

## Description
This project implements a REST API based on the provided OpenAPI/Swagger definition. The API is built using Node.js and provides various endpoints for performing tasks such as domain lookup, IP validation, fetching query history, and more.

## Features
- RESTful API endpoints based on OpenAPI/Swagger definition.
- Prometheus metrics endpoint at `/metrics`. Also it has two pre-defined metrics, one is counting all endpoints request and one is health.
- Health endpoint at `/health`.
- History clear endpoint at `/v1/history/clear`.
- Ability to lookup IPv4 addresses for a given domain.
- Validate IPv4 addresses.
- Retrieve and display the latest 20 saved queries.
- Access log for API requests.
- Graceful shutdown handling.

## Development Environment
The project is fully Dockerized using Docker and Docker Compose. The development environment includes all necessary services and tools defined in Docker Compose. Developers can easily run the project with a single command:  
`docker-compose up -d --build`

## Kubernetes support
The project is also fully managed by helm. To use the helm-app folder, Go to the terminal with kubectl ready for your kubernetes cluster.  
`kubectl create ns stakefish-app`  
Make sure that you use correct storageclass(for the database's PV) in root values.yaml  
`helm install helm-app-release ./helm-app`

That's it, it will install 2 charts - api and mongodb into your cluster namespace. And you can use ingress or port forwarding the service to test it. The image is using my docker hub public registry.

## CI Pipeline Description
It is using gitlab pipeline and file is .gitlab-ci.yml
#### Stages
- **test:** Executes tests for the application.
- **build:** Builds a Docker image for the application.
- **package:** Packages the application into a Helm chart.

#### Variables
- **DOCKER_IMAGE_NAME:** Specifies the Docker image name as `dicktangdev/problem-main`.
- **DOCKER_IMAGE_TAG:** Uses the short SHA of the commit (`$CI_COMMIT_SHORT_SHA`) as the Docker image tag.

#### Test Stage
- **Image:** Utilizes the `node:latest` Docker image for testing.
- **Script:**
  - Installs dependencies with `npm install`.
  - Navigates to the `src` directory and runs tests (disabled due to MongoDB requirement, will explain in local environment).

#### Build Stage
- **Image:** Uses the `docker:20.10.16` Docker image.
- **Services:** Includes Docker-in-Docker (DinD) service.
- **Before Script:** Verifies Docker installation.
- **Script:**
  - Navigates to the `src` directory and builds the Docker image using the specified name and tag.
  - Docker push command is commented out (requires Docker login).

#### Package Stage
- **Image:** Utilizes the `alpine/helm:latest` Docker image.
- **Script:**
  - Updates the image tag in the Helm chart's `values.yaml` file.
  - Packages the Helm chart into a `.tgz` file.
- **Artifacts:** Stores the packaged Helm chart in the `charts` directory as a `.tgz` file.  


## Local Environment
I also make the code can run in the local environment, as the endpoint test cases are required to connect with Mongodb to get passed.

From the app.js in src folder, you can see comment  
`Connect to MongoDB from local without authentication`  
And you can comment out the code below, and comment the code under "Connect to MongoDB" comment

Then make sure you install required package for node.js and running mongodb in local. Then run  
`node app.js`  
And `npm test` for test cases  
I can show you in the demo as well. Thanks.