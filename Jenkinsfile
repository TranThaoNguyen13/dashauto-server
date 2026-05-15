// DashAuto CI — tự chạy khi push Git:
// 1) GitHub Webhook → http://<jenkins-host>:8080/github-webhook/
// 2) Hoặc poll SCM mỗi ~5 phút (fallback)
// Job tự tạo lần đầu: jenkins/ref/init.groovy.d/create-dashauto-pipeline.groovy

pipeline {
  agent any

  options {
    timestamps()
    timeout(time: 20, unit: 'MINUTES')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '15'))
  }

  triggers {
    githubPush()
    pollSCM('H/5 * * * *')
  }

  environment {
    CI = 'true'
    NODE_ENV = 'test'
    COMPOSE_PROJECT_NAME = "dashauto-ci-${BUILD_NUMBER}"
    CI_DB_HOST = '172.17.0.1'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Environment') {
      steps {
        sh 'node -v && npm -v'
        sh 'docker --version || echo "docker CLI not available"'
        sh 'docker compose version || docker-compose --version || true'
      }
    }

    stage('Install Dependencies') {
      steps {
        sh 'npm ci || npm install'
      }
    }

    stage('Validate Backend') {
      steps {
        sh 'node --check index.js'
        sh 'node --check src/app.js'
        sh 'node --check src/services/automation.service.js'
        sh 'node -e "require(\\"./src/app\\"); console.log(\\"app module ok\\")"'
      }
    }

    stage('Validate n8n Workflows') {
      steps {
        sh 'node scripts/ci-validate-workflows.js'
      }
    }

    stage('Docker Compose Config') {
      steps {
        sh 'docker compose -f docker-compose.yml config --quiet'
        sh 'docker compose -f docker-compose.ci.yml config --quiet'
      }
    }

    stage('Integration Smoke Test') {
      steps {
        sh 'chmod +x scripts/ci-smoke-test.sh'
        sh 'npm run ci:smoke'
      }
    }
  }

  post {
    always {
      sh 'docker compose -f docker-compose.ci.yml down -v --remove-orphans 2>/dev/null || true'
    }
    success {
      echo 'SUCCESS: DashAuto CI passed (backend + workflows + smoke test).'
    }
    failure {
      echo 'FAILURE: Xem log từng stage phía trên.'
    }
  }
}
