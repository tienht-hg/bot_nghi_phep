pipeline {
  agent {
    kubernetes {
      cloud 'dev-44tt-cluster'
      namespace 'jenkins'
      yaml """
apiVersion: v1
kind: Pod
metadata:
  labels:
    jenkins: agent
spec:
  securityContext:
    runAsUser: 0
    fsGroup: 0
  serviceAccountName: jenkins
  imagePullSecrets:
    - name: harbor-cred
  volumes:
  - name: dind-storage
    emptyDir: {}
  containers:
  - name: jnlp
    image: jenkins/inbound-agent:latest
    securityContext:
      runAsUser: 0
    resources:
      requests:
        cpu: 100m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 512Mi
  - name: dind
    image: docker:27-dind
    securityContext:
      privileged: true
    volumeMounts:
    - name: dind-storage
      mountPath: /var/lib/docker
    env:
    - name: DOCKER_TLS_CERTDIR
      value: ""
    - name: DOCKER_BUILDKIT
      value: "1"
    resources:
      requests:
        cpu: 500m
        memory: 1Gi
      limits:
        cpu: 2000m
        memory: 4Gi
  - name: docker-cli
    image: docker:27-cli
    securityContext:
      runAsUser: 0
    command:
    - /bin/sh
    - -c
    - cat
    tty: true
    env:
    - name: DOCKER_HOST
      value: tcp://localhost:2375
    resources:
      requests:
        cpu: 300m
        memory: 256Mi
      limits:
        cpu: 1000m
        memory: 1Gi
  - name: kubectl
    image: bitnami/kubectl:latest
    securityContext:
      runAsUser: 0
    command:
    - /bin/bash
    - -c
    - cat
    tty: true
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 512Mi
"""
    }
  }

  parameters {
    string(name: 'GIT_BRANCH', defaultValue: 'main', description: 'Nhanh git can deploy')
  }

  environment {
    GIT_BRANCH = "${params.GIT_BRANCH}"
    GIT_URL = 'https://github.com/tienht-hg/bot_nghi_phep.git'

    IMAGE_NAMESPACE = 'bot-nghi-phep'
    IMAGE_NAME = 'bot-nghi-phep'
    KUBERNETES_NAMESPACE = 'bot-nghi-phep'
    KUBERNETES_DEPLOYMENT_NAME = 'bot-nghi-phep'
    KUBERNETES_DEPLOYMENT_CONTAINER_NAME = 'bot-nghi-phep'

    REGISTRY_URL = 'harbor.hgmedia.dev'
    IMAGE_URL = "${REGISTRY_URL}/${IMAGE_NAMESPACE}/${IMAGE_NAME}:${GIT_BRANCH.replace('/', '-')}-${BUILD_NUMBER}"
  }

  stages {
    stage('Checkout Code') {
      steps {
        script {
          checkout([$class: 'GitSCM',
              branches: [[name: "*/${GIT_BRANCH}"]],
              userRemoteConfigs: [[
                url: "${GIT_URL}",
                credentialsId: 'tienht-hg'
              ]],
              extensions: [
                [$class: 'CloneOption', depth: 1, noTags: true, shallow: true]
              ]
            ])
        }
      }
    }

    stage('Build Docker Image') {
      steps {
        container('docker-cli') {
          sh '''
            echo "Building Docker image..."
            export DOCKER_BUILDKIT=1

            docker build -t $IMAGE_URL \
              --cache-from $REGISTRY_URL/$IMAGE_NAMESPACE/$IMAGE_NAME:cache \
              --build-arg BUILDKIT_INLINE_CACHE=1 \
              -f Dockerfile .

            echo "Docker image built successfully"
          '''
        }
      }
    }

    stage('Push Docker Image') {
      steps {
        container('docker-cli') {
          withCredentials([usernamePassword(
              credentialsId: 'deploy_harbor.hgmedia.dev',
              usernameVariable: 'REGISTRY_USER',
              passwordVariable: 'REGISTRY_PASS'
          )]) {
            sh '''
              set -eux
              echo "$REGISTRY_PASS" | docker login $REGISTRY_URL -u "$REGISTRY_USER" --password-stdin
              docker push $IMAGE_URL

              # Tag as cache + latest
              docker tag $IMAGE_URL $REGISTRY_URL/$IMAGE_NAMESPACE/$IMAGE_NAME:cache
              docker push $REGISTRY_URL/$IMAGE_NAMESPACE/$IMAGE_NAME:cache

              docker tag $IMAGE_URL $REGISTRY_URL/$IMAGE_NAMESPACE/$IMAGE_NAME:latest
              docker push $REGISTRY_URL/$IMAGE_NAMESPACE/$IMAGE_NAME:latest
            '''
          }
        }
      }
    }

    stage('Deploy to Kubernetes') {
      steps {
        container('kubectl') {
          sh """
            kubectl set image deployment/${KUBERNETES_DEPLOYMENT_NAME} \
              ${KUBERNETES_DEPLOYMENT_CONTAINER_NAME}=${IMAGE_URL} \
              -n ${KUBERNETES_NAMESPACE}

            kubectl rollout status deployment/${KUBERNETES_DEPLOYMENT_NAME} \
              -n ${KUBERNETES_NAMESPACE} --timeout=300s
          """
        }
      }
    }
  }

  post {
    success {
      echo "Deploy thanh cong! Image: ${IMAGE_URL}"
    }
    failure {
      echo "Deploy that bai! Kiem tra logs."
      container('kubectl') {
        sh "kubectl rollout undo deployment/${KUBERNETES_DEPLOYMENT_NAME} -n ${KUBERNETES_NAMESPACE} || true"
      }
    }
    always {
      container('docker-cli') {
        sh "docker rmi ${IMAGE_URL} || true"
      }
    }
  }
}
