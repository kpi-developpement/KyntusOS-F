pipeline {
    agent any

    environment {
        COMPOSE_PROJECT_NAME = "kyntus-workflow-prod"
    }

    stages {
        stage('🧹 Clean & Checkout') {
            steps {
                script {
                    echo "=> [ÉTAPE 1] Nettoyage w téléchargement dyal l'Code mn GitHub..."
                    cleanWs()
                    checkout scm
                }
            }
        }

        stage('💥 Risk Management: Assassination') {
            steps {
                script {
                    echo "=> [ÉTAPE 1.5] N-tiy7ou l-containers l-qdam dyal Backend w Frontend (L'DB at-bqa trankil)..."
                    // 🔥 THE FIX: Jenkins ghay-tiri f l-containers l-qdam f blastek
                    // '|| true' kat-3ni: ila malqithoumch, machi mochkil kemmel l'pipeline
                    sh "docker rm -f kyntus-backend kyntus-frontend || true"
                }
            }
        }

        stage('🚀 Build & Deploy (Compose)') {
            steps {
                script {
                    echo "=> [ÉTAPE 2] Lancement dyal l'ecosysteme jdid..."
                    // Ghay-lanci l-code jdid li m-connecti m3a l-DB l-qedima
                    sh "docker compose -f docker-compose.yml up -d --build"
                }
            }
        }

        stage('🛡️ Clean Up (Images)') {
            steps {
                script {
                    echo "=> [ÉTAPE 3] Nettoyage dyal les vieilles images Docker bach may-3merch l'serveur..."
                    sh "docker image prune -f"
                }
            }
        }
    }

    post {
        success {
            echo "========================================================"
            echo "✅ DÉPLOIEMENT RÉUSSI B NAJA7 A L'ARCHITECTE !"
            echo "🌐 Frontend: http://10.10.10.50:3000"
            echo "⚙️ Backend: http://10.10.10.50:8082"
            echo "🛡️ Base de Données : INTACTE ET CONNECTÉE"
            echo "========================================================"
        }
        failure {
            echo "❌ ÉCHEC DU DÉPLOIEMENT. Dkhol l'logs dyal Jenkins t-vérifier achno w9e3."
        }
    }
}