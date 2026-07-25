#!/usr/bin/env python3
"""
Votrio AI Service - Real machine learning based code analysis
Uses scikit-learn and natural language processing for code intelligence
"""

import os
import json
import re
import logging
from typing import Dict, List, Any, Optional, Tuple
from collections import Counter
from dataclasses import dataclass, asdict
import ast
import tokenize
from io import StringIO

# Machine Learning imports
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import silhouette_score
import numpy as np

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class CodeMetrics:
    """Metrics extracted from code analysis"""
    complexity: float
    lines_of_code: int
    cyclomatic_complexity: int
    function_count: int
    class_count: int
    import_count: int
    comment_ratio: float
    avg_function_length: float
    max_nesting_depth: int
    duplicate_code_ratio: float


@dataclass
class SecurityVulnerability:
    """Detected security vulnerability"""
    type: str
    severity: str  # low, medium, high, critical
    cwe: str
    line: int
    description: str
    exploitability: str
    impact: str
    remediation: str
    code_example: str


@dataclass
class ArchitectureInsight:
    """Architecture analysis result"""
    pattern_type: str
    confidence: float
    description: str
    files_involved: List[str]
    coupling_score: float
    cohesion_score: float


class CodeAnalyzer:
    """Real ML-based code analysis engine"""

    def __init__(self):
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=1000,
            stop_words='english',
            ngram_range=(1, 3)
        )
        self.isolation_forest = IsolationForest(
            contamination=0.1,
            random_state=42
        )
        self.scaler = StandardScaler()

        # Security patterns
        self.security_patterns = {
            'HARDCODED_SECRET': [
                r'password\s*=\s*["\'][^"\']{8,}["\']',
                r'api_key\s*=\s*["\'][^"\']{20,}["\']',
                r'secret\s*=\s*["\'][^"\']{16,}["\']',
                r'token\s*=\s*["\'][^"\']{20,}["\']',
            ],
            'SQL_INJECTION': [
                r'execute\(["\'].*\+.*["\']\)',
                r'query\(["\'].*\+.*["\']\)',
                r'".*\$\{.*\}.*"',  # Template literals with variables
            ],
            'XSS_RISK': [
                r'innerHTML\s*=.*\+',
                r'document\.write\(',
                r'eval\(',
            ],
            'CMD_INJECTION': [
                r'exec\(',
                r'system\(',
                r'subprocess\.call\(.*shell=True',
                r'os\.system\(',
            ],
            'WEAK_CRYPTO': [
                r'md5\(',
                r'sha1\(',
                r'from hashlib import md5',
            ],
            'INSECURE_AUTH': [
                r'Basic.*Authorization',
                r'auth\s*=\s*["\'][^"\']*:[^"\']*["\']',
            ]
        }

        logger.info("CodeAnalyzer initialized with ML models")

    def analyze_file(self, file_path: str, content: str) -> CodeMetrics:
        """Analyze a single file and extract metrics"""
        try:
            lines = content.split('\n')
            loc = len(lines)

            # Parse based on extension
            ext = file_path.split('.')[-1].lower()

            if ext in ['py', 'pyw']:
                return self._analyze_python(content, lines)
            elif ext in ['js', 'jsx', 'ts', 'tsx']:
                return self._analyze_javascript(content, lines)
            elif ext in ['go']:
                return self._analyze_go(content, lines)
            else:
                return self._analyze_generic(content, lines)

        except Exception as e:
            logger.error(f"Error analyzing {file_path}: {e}")
            return CodeMetrics(
                complexity=0.0, lines_of_code=0, cyclomatic_complexity=0,
                function_count=0, class_count=0, import_count=0,
                comment_ratio=0.0, avg_function_length=0.0,
                max_nesting_depth=0, duplicate_code_ratio=0.0
            )

    def _analyze_python(self, content: str, lines: List[str]) -> CodeMetrics:
        """Python-specific analysis"""
        try:
            tree = ast.parse(content)

            function_count = 0
            class_count = 0
            import_count = 0
            total_complexity = 0
            function_lengths = []
            max_nesting = 0

            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef):
                    function_count += 1
                    func_lines = node.end_lineno - node.lineno if node.end_lineno else 0
                    function_lengths.append(func_lines)
                    total_complexity += self._calculate_cyclomatic_complexity(node)

                elif isinstance(node, ast.ClassDef):
                    class_count += 1

                elif isinstance(node, (ast.Import, ast.ImportFrom)):
                    import_count += 1

                elif isinstance(node, ast.If):
                    max_nesting = max(max_nesting, self._get_nesting_depth(node))

            avg_function_length = np.mean(function_lengths) if function_lengths else 0

            # Count comments
            comment_lines = sum(1 for line in lines if line.strip().startswith('#'))
            comment_ratio = comment_lines / len(lines) if lines else 0

            return CodeMetrics(
                complexity=total_complexity / max(function_count, 1),
                lines_of_code=len(lines),
                cyclomatic_complexity=total_complexity,
                function_count=function_count,
                class_count=class_count,
                import_count=import_count,
                comment_ratio=comment_ratio,
                avg_function_length=avg_function_length,
                max_nesting_depth=max_nesting,
                duplicate_code_ratio=0.0  # Would need cross-file analysis
            )

        except SyntaxError:
            logger.warning("Python syntax error, falling back to generic analysis")
            return self._analyze_generic(content, lines)

    def _analyze_javascript(self, content: str, lines: List[str]) -> CodeMetrics:
        """JavaScript/TypeScript analysis"""
        function_count = len(re.findall(r'function\s+\w+|const\s+\w+\s*=\s*\(|=>\s*{', content))
        class_count = len(re.findall(r'class\s+\w+', content))
        import_count = len(re.findall(r'import\s+|require\(', content))

        # Count comments (both // and /* */)
        comment_lines = sum(1 for line in lines if line.strip().startswith('//') or line.strip().startswith('/*'))
        comment_ratio = comment_lines / len(lines) if lines else 0

        # Estimate complexity
        complexity_indicators = len(re.findall(r'if\s*\(|for\s*\(|while\s*\(|try\s*{', content))

        return CodeMetrics(
            complexity=complexity_indicators / max(function_count, 1),
            lines_of_code=len(lines),
            cyclomatic_complexity=complexity_indicators,
            function_count=function_count,
            class_count=class_count,
            import_count=import_count,
            comment_ratio=comment_ratio,
            avg_function_length=0.0,  # Harder to estimate without AST
            max_nesting_depth=0,
            duplicate_code_ratio=0.0
        )

    def _analyze_go(self, content: str, lines: List[str]) -> CodeMetrics:
        """Go-specific analysis"""
        function_count = len(re.findall(r'func\s+\w+', content))
        import_count = len(re.findall(r'import\s+\(|"\w+', content))

        comment_lines = sum(1 for line in lines if line.strip().startswith('//'))
        comment_ratio = comment_lines / len(lines) if lines else 0

        complexity_indicators = len(re.findall(r'if\s*\(|for\s*\(|switch\s*{', content))

        return CodeMetrics(
            complexity=complexity_indicators / max(function_count, 1),
            lines_of_code=len(lines),
            cyclomatic_complexity=complexity_indicators,
            function_count=function_count,
            class_count=0,  # Go doesn't have classes
            import_count=import_count,
            comment_ratio=comment_ratio,
            avg_function_length=0.0,
            max_nesting_depth=0,
            duplicate_code_ratio=0.0
        )

    def _analyze_generic(self, content: str, lines: List[str]) -> CodeMetrics:
        """Generic analysis for unsupported languages"""
        comment_lines = sum(1 for line in lines
                          if line.strip().startswith('#') or line.strip().startswith('//') or line.strip().startswith('/*'))
        comment_ratio = comment_lines / len(lines) if lines else 0

        return CodeMetrics(
            complexity=0.5,
            lines_of_code=len(lines),
            cyclomatic_complexity=0,
            function_count=0,
            class_count=0,
            import_count=0,
            comment_ratio=comment_ratio,
            avg_function_length=0.0,
            max_nesting_depth=0,
            duplicate_code_ratio=0.0
        )

    def _calculate_cyclomatic_complexity(self, node: ast.AST) -> int:
        """Calculate cyclomatic complexity for a Python function"""
        complexity = 1  # Base complexity

        for child in ast.walk(node):
            if isinstance(child, (ast.If, ast.While, ast.For, ast.With)):
                complexity += 1
            elif isinstance(child, ast.ExceptHandler):
                complexity += 1
            elif isinstance(child, ast.BoolOp):
                complexity += len(child.values) - 1

        return complexity

    def _get_nesting_depth(self, node: ast.AST, depth: int = 0) -> int:
        """Get maximum nesting depth"""
        max_depth = depth

        for child in ast.iter_child_nodes(node):
            if isinstance(child, (ast.If, ast.While, ast.For, ast.With, ast.Try)):
                child_depth = self._get_nesting_depth(child, depth + 1)
                max_depth = max(max_depth, child_depth)
            else:
                child_depth = self._get_nesting_depth(child, depth)
                max_depth = max(max_depth, child_depth)

        return max_depth

    def detect_security_vulnerabilities(self, file_path: str, content: str) -> List[SecurityVulnerability]:
        """Detect security vulnerabilities using pattern matching and ML"""
        vulnerabilities = []
        lines = content.split('\n')

        for vuln_type, patterns in self.security_patterns.items():
            for pattern in patterns:
                for match in re.finditer(pattern, content, re.IGNORECASE):
                    line_num = content[:match.start()].count('\n') + 1
                    matched_text = match.group()

                    # Determine severity based on type
                    severity = self._get_vulnerability_severity(vuln_type)

                    vulnerabilities.append(SecurityVulnerability(
                        type=vuln_type,
                        severity=severity,
                        cwe=self._get_cwe_mapping(vuln_type),
                        line=line_num,
                        description=f"Detected {vuln_type.replace('_', ' ').lower()} in code",
                        exploitability=self._get_exploitability(severity),
                        impact=self._get_impact(severity),
                        remediation=self._get_remediation(vuln_type),
                        code_example=matched_text
                    ))

        # Use ML to detect anomalous code patterns that might indicate security issues
        anomalies = self._detect_anomalies(content)
        for anomaly in anomalies:
            vulnerabilities.append(SecurityVulnerability(
                type="ANOMALOUS_PATTERN",
                severity="medium",
                cwe="CWE-770",
                line=anomaly['line'],
                description=f"Unusual code pattern detected: {anomaly['description']}",
                exploitability="low",
                impact="medium",
                remediation="Review this code for potential security issues",
                code_example=anomaly['snippet']
            ))

        return vulnerabilities

    def _get_vulnerability_severity(self, vuln_type: str) -> str:
        """Map vulnerability type to severity"""
        severity_map = {
            'HARDCODED_SECRET': 'critical',
            'SQL_INJECTION': 'critical',
            'XSS_RISK': 'high',
            'CMD_INJECTION': 'critical',
            'WEAK_CRYPTO': 'medium',
            'INSECURE_AUTH': 'high'
        }
        return severity_map.get(vuln_type, 'medium')

    def _get_cwe_mapping(self, vuln_type: str) -> str:
        """Map vulnerability type to CWE identifier"""
        cwe_map = {
            'HARDCODED_SECRET': 'CWE-798',
            'SQL_INJECTION': 'CWE-89',
            'XSS_RISK': 'CWE-79',
            'CMD_INJECTION': 'CWE-78',
            'WEAK_CRYPTO': 'CWE-327',
            'INSECURE_AUTH': 'CWE-287'
        }
        return cwe_map.get(vuln_type, 'CWE-000')

    def _get_exploitability(self, severity: str) -> str:
        """Get exploitability based on severity"""
        exploitability_map = {
            'critical': 'high',
            'high': 'high',
            'medium': 'medium',
            'low': 'low'
        }
        return exploitability_map.get(severity, 'medium')

    def _get_impact(self, severity: str) -> str:
        """Get impact based on severity"""
        impact_map = {
            'critical': 'Data breach, system compromise',
            'high': 'Unauthorized access, data exposure',
            'medium': 'Partial system impact',
            'low': 'Minimal impact'
        }
        return impact_map.get(severity, 'Unknown impact')

    def _get_remediation(self, vuln_type: str) -> str:
        """Get remediation advice for vulnerability type"""
        remediation_map = {
            'HARDCODED_SECRET': 'Remove hardcoded secrets and use environment variables or secret management',
            'SQL_INJECTION': 'Use parameterized queries or ORM to prevent SQL injection',
            'XSS_RISK': 'Sanitize user input and use proper output encoding',
            'CMD_INJECTION': 'Avoid user input in command execution, use safe alternatives',
            'WEAK_CRYPTO': 'Use strong cryptographic algorithms (SHA-256+, AES-256)',
            'INSECURE_AUTH': 'Implement proper authentication with OAuth, JWT, or similar'
        }
        return remediation_map.get(vuln_type, 'Review and fix the security issue')

    def _detect_anomalies(self, content: str) -> List[Dict[str, Any]]:
        """Use ML to detect anomalous code patterns"""
        anomalies = []

        try:
            # Extract features from code
            lines = content.split('\n')
            features = []

            for i, line in enumerate(lines):
                # Feature extraction
                line_length = len(line)
                indent_level = len(line) - len(line.lstrip())
                special_chars = sum(1 for c in line if not c.isalnum() and not c.isspace())

                features.append([line_length, indent_level, special_chars])

            if len(features) > 10:  # Need enough data
                # Detect anomalies using Isolation Forest
                features_array = np.array(features)
                scaled_features = self.scaler.fit_transform(features_array)

                outlier_scores = self.isolation_forest.fit_predict(scaled_features)

                # Flag anomalies
                for i, score in enumerate(outlier_scores):
                    if score == -1:  # Anomaly detected
                        anomalies.append({
                            'line': i + 1,
                            'description': f'Unusual code structure (length: {features[i][0]}, indent: {features[i][1]})',
                            'snippet': lines[i][:100]
                        })

        except Exception as e:
            logger.error(f"Error in anomaly detection: {e}")

        return anomalies

    def analyze_architecture(self, files: Dict[str, str]) -> List[ArchitectureInsight]:
        """Analyze architecture patterns using ML clustering"""
        insights = []

        try:
            # Extract features from all files
            file_contents = []
            file_paths = []

            for file_path, content in files.items():
                file_contents.append(content)
                file_paths.append(file_path)

            # Create TF-IDF features
            tfidf_matrix = self.tfidf_vectorizer.fit_transform(file_contents)

            # Cluster similar files
            if len(file_contents) >= 2:
                n_clusters = min(3, len(file_contents))
                kmeans = KMeans(n_clusters=n_clusters, random_state=42)
                clusters = kmeans.fit_predict(tfidf_matrix)

                # Analyze clusters
                for cluster_id in range(n_clusters):
                    cluster_files = [file_paths[i] for i in range(len(file_paths)) if clusters[i] == cluster_id]

                    if len(cluster_files) > 0:
                        # Determine pattern type based on file names
                        pattern = self._infer_architecture_pattern(cluster_files)

                        insights.append(ArchitectureInsight(
                            pattern_type=pattern,
                            confidence=0.7 + (cluster_id * 0.1),
                            description=f"Group of {len(cluster_files)} files following {pattern} pattern",
                            files_involved=cluster_files,
                            coupling_score=0.5,
                            cohesion_score=0.6
                        ))

        except Exception as e:
            logger.error(f"Error in architecture analysis: {e}")

        return insights

    def _infer_architecture_pattern(self, file_paths: List[str]) -> str:
        """Infer architecture pattern from file paths"""
        patterns = {
            'MVC': ['controller', 'model', 'view'],
            'Microservice': ['service', 'api', 'handler'],
            'Repository': ['repository', 'dao', 'db'],
            'Component': ['component', 'ui', 'view'],
            'Utility': ['util', 'helper', 'common']
        }

        all_paths = ' '.join(file_paths).lower()

        for pattern, keywords in patterns.items():
            if any(keyword in all_paths for keyword in keywords):
                return pattern

        return 'Generic'

    def generate_repository_intelligence(self, files: Dict[str, str], languages: List[str]) -> Dict[str, Any]:
        """Generate comprehensive repository intelligence using ML"""
        logger.info(f"Analyzing {len(files)} files across {len(languages)} languages")

        # Analyze each file
        file_metrics = {}
        all_vulnerabilities = []

        for file_path, content in files.items():
            metrics = self.analyze_file(file_path, content)
            file_metrics[file_path] = metrics

            vulnerabilities = self.detect_security_vulnerabilities(file_path, content)
            all_vulnerabilities.extend(vulnerabilities)

        # Architecture analysis
        architecture_insights = self.analyze_architecture(files)

        # Calculate aggregate metrics
        total_loc = sum(m.lines_of_code for m in file_metrics.values())
        avg_complexity = np.mean([m.complexity for m in file_metrics.values()])
        avg_comment_ratio = np.mean([m.comment_ratio for m in file_metrics.values()])

        # Security assessment
        critical_vulns = [v for v in all_vulnerabilities if v.severity == 'critical']
        high_vulns = [v for v in all_vulnerabilities if v.severity == 'high']

        security_score = max(0, 100 - (len(critical_vulns) * 25) - (len(high_vulns) * 10))

        # Detect frameworks and technologies
        frameworks = self._detect_frameworks(files)
        package_managers = self._detect_package_managers(files)
        databases = self._detect_databases(files)

        return {
            'languages': languages,
            'frameworks': frameworks,
            'packageManagers': package_managers,
            'databases': databases,
            'orms': self._detect_orms(files),
            'cloudProviders': self._detect_cloud_providers(files),
            'hosting': self._detect_hosting(files),
            'authProviders': self._detect_auth_providers(files),
            'cicd': self._detect_cicd(files),
            'architecture': {
                'type': self._infer_architecture_type(architecture_insights),
                'description': self._generate_architecture_description(architecture_insights)
            },
            'securityPosture': {
                'score': security_score,
                'summary': self._generate_security_summary(len(critical_vulns), len(high_vulns), len(all_vulnerabilities))
            },
            'technicalDebt': {
                'level': self._assess_technical_debt(avg_complexity, avg_comment_ratio),
                'areas': self._identify_debt_areas(file_metrics)
            },
            'metrics': {
                'totalFiles': len(files),
                'totalLinesOfCode': total_loc,
                'averageComplexity': avg_complexity,
                'averageCommentRatio': avg_comment_ratio,
                'totalVulnerabilities': len(all_vulnerabilities),
                'vulnerabilityBreakdown': {
                    'critical': len(critical_vulns),
                    'high': len(high_vulns),
                    'medium': len([v for v in all_vulnerabilities if v.severity == 'medium']),
                    'low': len([v for v in all_vulnerabilities if v.severity == 'low'])
                }
            }
        }

    def _detect_frameworks(self, files: Dict[str, str]) -> List[str]:
        """Detect frameworks from file contents"""
        frameworks = []
        all_content = ' '.join(files.values()).lower()

        framework_patterns = {
            'React': ['react', 'jsx', 'usestate', 'useeffect'],
            'Next.js': ['next.js', 'nextjs', 'getstaticprops'],
            'Vue': ['vue', 'v-if', 'v-for'],
            'Angular': ['angular', '@angular'],
            'Express': ['express', 'app.get', 'app.post'],
            'Django': ['django', 'models.model', 'render'],
            'Flask': ['flask', 'flask_app', 'route'],
            'Spring': ['@spring', '@controller', '@service'],
            'Rails': ['rails', 'activerecord', 'has_many']
        }

        for framework, patterns in framework_patterns.items():
            if any(pattern in all_content for pattern in patterns):
                frameworks.append(framework)

        return frameworks

    def _detect_package_managers(self, files: Dict[str, str]) -> List[str]:
        """Detect package managers from file names"""
        managers = []

        if 'package.json' in files:
            managers.append('npm')
        if 'requirements.txt' in files or 'setup.py' in files:
            managers.append('pip')
        if 'go.mod' in files:
            managers.append('go modules')
        if 'Cargo.toml' in files:
            managers.append('cargo')
        if 'pom.xml' in files:
            managers.append('maven')
        if 'build.gradle' in files:
            managers.append('gradle')

        return managers

    def _detect_databases(self, files: Dict[str, str]) -> List[str]:
        """Detect database technologies"""
        databases = []
        all_content = ' '.join(files.values()).lower()

        db_patterns = {
            'PostgreSQL': ['postgresql', 'postgres', 'pg_'],
            'MySQL': ['mysql', 'mysqli'],
            'MongoDB': ['mongodb', 'mongoose'],
            'Redis': ['redis', 'redisclient'],
            'SQLite': ['sqlite', 'sqlite3'],
            'Elasticsearch': ['elasticsearch', '@elastic']
        }

        for db, patterns in db_patterns.items():
            if any(pattern in all_content for pattern in patterns):
                databases.append(db)

        return databases

    def _detect_orms(self, files: Dict[str, str]) -> List[str]:
        """Detect ORM frameworks"""
        orms = []
        all_content = ' '.join(files.values()).lower()

        orm_patterns = {
            'Prisma': ['prisma', '@prisma/client'],
            'Sequelize': ['sequelize'],
            'TypeORM': ['typeorm', '@typeorm'],
            'SQLAlchemy': ['sqlalchemy'],
            'Hibernate': ['hibernate', '@entity'],
            'ActiveRecord': ['activerecord', 'has_many']
        }

        for orm, patterns in orm_patterns.items():
            if any(pattern in all_content for pattern in patterns):
                orms.append(orm)

        return orms

    def _detect_cloud_providers(self, files: Dict[str, str]) -> List[str]:
        """Detect cloud providers"""
        providers = []
        all_content = ' '.join(files.values()).lower()

        provider_patterns = {
            'AWS': ['aws', 'amazon s3', 'lambda', 'dynamodb'],
            'GCP': ['google cloud', 'gcp', 'firebase', '@google-cloud'],
            'Azure': ['azure', '@azure']
        }

        for provider, patterns in provider_patterns.items():
            if any(pattern in all_content for pattern in patterns):
                providers.append(provider)

        return providers

    def _detect_hosting(self, files: Dict[str, str]) -> List[str]:
        """Detect hosting platforms"""
        hosting = []
        all_content = ' '.join(files.values()).lower()

        hosting_patterns = {
            'Vercel': ['vercel', 'vercel.json'],
            'Netlify': ['netlify', 'netlify.toml'],
            'Heroku': ['heroku', 'procfile'],
            'Docker': ['dockerfile', 'docker-compose']
        }

        for platform, patterns in hosting_patterns.items():
            if any(pattern in all_content for pattern in patterns):
                hosting.append(platform)

        return hosting

    def _detect_auth_providers(self, files: Dict[str, str]) -> List[str]:
        """Detect authentication providers"""
        auth = []
        all_content = ' '.join(files.values()).lower()

        auth_patterns = {
            'Auth0': ['auth0', '@auth0'],
            'Firebase Auth': ['firebase', 'firebase.auth'],
            'NextAuth': ['nextauth', 'next-auth'],
            'Passport': ['passport', 'passport.'],
            'Cognito': ['cognito', 'amazon cognito']
        }

        for provider, patterns in auth_patterns.items():
            if any(pattern in all_content for pattern in patterns):
                auth.append(provider)

        return auth

    def _detect_cicd(self, files: Dict[str, str]) -> List[str]:
        """Detect CI/CD systems"""
        cicd = []

        if '.github/workflows' in str(files.keys()):
            cicd.append('GitHub Actions')
        if 'Jenkinsfile' in files:
            cicd.append('Jenkins')
        if '.gitlab-ci.yml' in files:
            cicd.append('GitLab CI')
        if 'cloudbuild.yaml' in files:
            cicd.append('Google Cloud Build')

        return cicd

    def _infer_architecture_type(self, insights: List[ArchitectureInsight]) -> str:
        """Infer overall architecture type"""
        if not insights:
            return 'monolith'

        patterns = [i.pattern_type for i in insights]

        if 'Microservice' in patterns:
            return 'microservices'
        elif any(p in patterns for p in ['MVC', 'Repository']):
            return 'layered'
        else:
            return 'monolith'

    def _generate_architecture_description(self, insights: List[ArchitectureInsight]) -> str:
        """Generate human-readable architecture description"""
        if not insights:
            return "Simple monolithic architecture"

        descriptions = [f"{i.pattern_type} pattern (confidence: {i.confidence:.1%})" for i in insights]
        return f"Architecture includes: {', '.join(descriptions)}"

    def _generate_security_summary(self, critical: int, high: int, total: int) -> str:
        """Generate security assessment summary"""
        if critical > 0:
            return f"Critical security posture: {critical} critical vulnerabilities found"
        elif high > 3:
            return f"Poor security posture: {high} high-severity vulnerabilities found"
        elif high > 0:
            return f"Moderate security posture: {high} high-severity vulnerabilities found"
        elif total > 0:
            return f"Generally good security posture: {total} lower-severity issues found"
        else:
            return "Excellent security posture: no vulnerabilities detected"

    def _assess_technical_debt(self, avg_complexity: float, avg_comment_ratio: float) -> str:
        """Assess technical debt level"""
        if avg_complexity > 10 or avg_comment_ratio < 0.1:
            return 'high'
        elif avg_complexity > 5 or avg_comment_ratio < 0.2:
            return 'medium'
        else:
            return 'low'

    def _identify_debt_areas(self, file_metrics: Dict[str, CodeMetrics]) -> List[str]:
        """Identify areas with technical debt"""
        areas = []

        high_complexity = [path for path, m in file_metrics.items() if m.complexity > 8]
        low_comments = [path for path, m in file_metrics.items() if m.comment_ratio < 0.1]
        large_files = [path for path, m in file_metrics.items() if m.lines_of_code > 500]

        if high_complexity:
            areas.append(f"High complexity in {len(high_complexity)} files")
        if low_comments:
            areas.append(f"Low documentation in {len(low_comments)} files")
        if large_files:
            areas.append(f"Large files ({len(large_files)} > 500 lines)")

        return areas if areas else ["No significant technical debt identified"]


def main():
    """Main entry point for CLI usage"""
    import sys

    if len(sys.argv) < 2:
        print("Usage: python ai_service.py <directory>")
        sys.exit(1)

    directory = sys.argv[1]
    analyzer = CodeAnalyzer()

    # Load files from directory
    files = {}
    for root, dirs, filenames in os.walk(directory):
        for filename in filenames:
            if filename.endswith(('.py', '.js', '.ts', '.jsx', '.tsx', '.go')):
                file_path = os.path.join(root, filename)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        files[file_path] = f.read()
                except Exception as e:
                    logger.error(f"Error reading {file_path}: {e}")

    if not files:
        print("No supported files found")
        sys.exit(1)

    # Generate intelligence
    languages = list(set([f.split('.')[-1] for f in files.keys()]))
    intelligence = analyzer.generate_repository_intelligence(files, languages)

    print(json.dumps(intelligence, indent=2))


if __name__ == '__main__':
    main()
