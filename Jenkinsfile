pipeline {
    agent {
        label 'int-node-stg-1'
    }
    stages {
        stage("Build") {
            steps {
                sh "sudo npm i"
            }
        }
        stage("Deploy") {
            steps {
                sh '''
                PM2_STATUS=$(sudo pm2 status)
                if echo "$PM2_STATUS" | grep -q 'node-cexmukhtar-2176'; then
                    echo "PM2 service is already running. Restarting..."
                    sudo pm2 restart node-cexmukhtar-2176
                else
                    echo "PM2 service is not running. Starting..."
                    sudo NODE_ENV=staging pm2 start index.js --name node-cexmukhtar-2176
                    echo "node-cexmukhtar.mobiloitte.io"
                fi
                '''
            }
        }
        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('mobiloitte-sonar') {
                    script {
                        def scannerHome = tool 'mobiloitte-sonar-scanner'
                        sh "${scannerHome}/bin/sonar-scanner"
                    }
                }
            }
        }
    }
    post {
        always {
            script {
                // Initialize and update BUILD_STATUS
                def buildOutcome = (currentBuild.result == null || currentBuild.result == 'SUCCESS') ? 'SUCCESS' : 'FAILURE'
                BUILD_STATUS = buildOutcome

                emailext to: 'csu-orange-team@mobiloitte.com, no-vishnu@mobiloitte.com,team-it@mobiloitte.com',
                         subject: 'PROJECT BUILD & SONAR REPORT via JENKINS',
                         body: """<html>
                                    <head>
                                        <style>
                                            .build-status {
                                                color: ${BUILD_STATUS == 'SUCCESS' ? 'green' : 'red'};
                                            }
                                        </style>
                                    </head>
                                    <body>
                                        <p>Hello,</p>
                                        <b><p>This notification is to inform you about your project's build has been $BUILD_STATUS.</p></b>
                                        <ul>
                                            <li><strong>Project Name:</strong> $PROJECT_NAME</li>
                                            <li><strong>Build Status:</strong> <span class="build-status">$BUILD_STATUS</span></li>
                                            <li><strong>Build Number:</strong> $BUILD_NUMBER</li>
                                            <b><p>Please click on the URL to check the SonarQube report of your project:</p></b>
                                            <li><strong>SonarQube Report:</strong> <a href="http://172.16.0.200:9000/dashboard?id=">SonarQube Dashboard</a>cex-exchange-mukhtar-24104238-nodejs</li>
                                            <li><strong>Build Log:</strong> <b><p>Attached Below</p></b></li>
                                        </ul>
                                    </body>
                                </html>""",
                         mimeType: 'text/html',
                         attachLog: true
            }
        }
    }
}
