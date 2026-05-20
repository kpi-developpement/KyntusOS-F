pipeline {
    agent any

    // S-smiya dyal l'projet f Docker Compose
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

        stage('🚀 Build & Deploy (Compose)') {
            steps {
                script {
                    echo "=> [ÉTAPE 2] Lancement dyal l'ecosysteme complet..."
                    // 🛡️ RISK MANAGEMENT: Kandirou ghir 'up -d --build'. 
                    // Makandirouch 'down -v' bach l'Volume dyal l'DB (postgres_data_v2) y-bqa sauvé 100%!
                    sh "docker compose -f docker-compose.yml up -d --build"
                }
            }
        }

        stage('🛡️ Risk Management (Clean Up)') {
            steps {
                script {
                    echo "=> [ÉTAPE 3] Nettoyage dyal les vieilles images Docker bach may-3merch l'serveur..."
                    // Kay-msse7 ghir les images li makhdaminch (Dangling), makayqissch l-Volumes!
                    sh "docker image prune -f"
                }
            }
        }

        stage('🔍 System Check (Logs)') {
            steps {
                script {
                    echo "=> [ÉTAPE 4] Vérification rapide dyal l'Moteur (Spring Boot)..."
                    // Kay-jbed lik 20 sterr mn l'backend bach t-t2ekked blli cha3el w m-connecti m3a DB
                    sh "docker logs --tail 20 kyntus-backend || true"
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
            echo "🛡️ Volume DB (postgres_data_v2) : INTACT ET SÉCURISÉ"
            echo "========================================================"
        }
        failure {
            echo "❌ ÉCHEC DU DÉPLOIEMENT. Dkhol l'logs dyal Jenkins t-vérifier achno w9e3."
        }
    }
}