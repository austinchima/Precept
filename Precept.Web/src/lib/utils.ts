import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper to generate a consistent hash color for unmapped skills
function getHashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 65%)`; // Vibrant pastel/neon
}

export function getSkillIcon(skillName: string): { icon: string, color: string } {
  const name = skillName.toLowerCase().trim();
  
  const iconMap: Record<string, { icon: string, color: string }> = {
    // Top Languages
    'javascript': { icon: 'devicon-javascript-plain colored', color: '#F7DF1E' },
    'js': { icon: 'devicon-javascript-plain colored', color: '#F7DF1E' },
    'typescript': { icon: 'devicon-typescript-plain colored', color: '#3178C6' },
    'ts': { icon: 'devicon-typescript-plain colored', color: '#3178C6' },
    'python': { icon: 'devicon-python-plain colored', color: '#3776AB' },
    'java': { icon: 'devicon-java-plain colored', color: '#007396' },
    'c#': { icon: 'devicon-csharp-plain colored', color: '#239120' },
    'csharp': { icon: 'devicon-csharp-plain colored', color: '#239120' },
    'c++': { icon: 'devicon-cplusplus-plain colored', color: '#00599C' },
    'c': { icon: 'devicon-c-plain colored', color: '#A8B9CC' },
    'php': { icon: 'devicon-php-plain colored', color: '#777BB4' },
    'ruby': { icon: 'devicon-ruby-plain colored', color: '#CC342D' },
    'go': { icon: 'devicon-go-original-wordmark colored', color: '#00ADD8' },
    'golang': { icon: 'devicon-go-original-wordmark colored', color: '#00ADD8' },
    'rust': { icon: 'devicon-rust-plain colored', color: '#DEA584' },
    'swift': { icon: 'devicon-swift-plain colored', color: '#F05138' },
    'kotlin': { icon: 'devicon-kotlin-plain colored', color: '#7F52FF' },
    'scala': { icon: 'devicon-scala-plain colored', color: '#DC322F' },
    'dart': { icon: 'devicon-dart-plain colored', color: '#0175C2' },
    'r': { icon: 'devicon-r-plain colored', color: '#276DC3' },
    'html': { icon: 'devicon-html5-plain colored', color: '#E34F26' },
    'css': { icon: 'devicon-css3-plain colored', color: '#1572B6' },
    
    // Top Frameworks & Libraries
    'react': { icon: 'devicon-react-original colored', color: '#61DAFB' },
    'react native': { icon: 'devicon-react-original colored', color: '#61DAFB' },
    'next.js': { icon: 'devicon-nextjs-plain', color: '#ffffff' },
    'nextjs': { icon: 'devicon-nextjs-plain', color: '#ffffff' },
    'angular': { icon: 'devicon-angularjs-plain colored', color: '#DD0031' },
    'vue': { icon: 'devicon-vuejs-plain colored', color: '#4FC08D' },
    'svelte': { icon: 'devicon-svelte-plain colored', color: '#FF3E00' },
    'node': { icon: 'devicon-nodejs-plain colored', color: '#339933' },
    'node.js': { icon: 'devicon-nodejs-plain colored', color: '#339933' },
    'express': { icon: 'devicon-express-original', color: '#ffffff' },
    'django': { icon: 'devicon-django-plain', color: '#092E20' },
    'flask': { icon: 'devicon-flask-original', color: '#ffffff' },
    'fastapi': { icon: 'devicon-fastapi-plain colored', color: '#009688' },
    'spring': { icon: 'devicon-spring-plain colored', color: '#6DB33F' },
    'spring boot': { icon: 'devicon-spring-plain colored', color: '#6DB33F' },
    '.net': { icon: 'devicon-dot-net-plain colored', color: '#512BD4' },
    'asp.net': { icon: 'devicon-dot-net-plain colored', color: '#512BD4' },
    'laravel': { icon: 'devicon-laravel-plain colored', color: '#FF2D20' },
    'ruby on rails': { icon: 'devicon-rails-plain colored', color: '#CC0000' },
    'tailwind': { icon: 'devicon-tailwindcss-plain colored', color: '#06B6D4' },
    'bootstrap': { icon: 'devicon-bootstrap-plain colored', color: '#7952B3' },
    'sass': { icon: 'devicon-sass-original colored', color: '#CC6699' },
    'graphql': { icon: 'devicon-graphql-plain colored', color: '#E10098' },
    'redux': { icon: 'devicon-redux-original colored', color: '#764ABC' },
    
    // DB & Message Brokers
    'sql': { icon: 'fa-solid fa-database', color: '#336791' },
    'mysql': { icon: 'devicon-mysql-plain colored', color: '#4479A1' },
    'postgresql': { icon: 'devicon-postgresql-plain colored', color: '#4169E1' },
    'postgres': { icon: 'devicon-postgresql-plain colored', color: '#4169E1' },
    'mongodb': { icon: 'devicon-mongodb-plain colored', color: '#47A248' },
    'mongo db': { icon: 'devicon-mongodb-plain colored', color: '#47A248' },
    'redis': { icon: 'devicon-redis-plain colored', color: '#DC382D' },
    'sqlite': { icon: 'devicon-sqlite-plain colored', color: '#003B57' },
    'cassandra': { icon: 'devicon-cassandra-plain colored', color: '#1287B1' },
    'elasticsearch': { icon: 'devicon-elasticsearch-plain colored', color: '#005571' },
    'kafka': { icon: 'devicon-apachekafka-original colored', color: '#231F20' },
    'rabbitmq': { icon: 'devicon-rabbitmq-plain colored', color: '#FF6600' },
    'firebase': { icon: 'devicon-firebase-plain colored', color: '#FFCA28' },
    
    // Cloud & DevOps & Tools
    'aws': { icon: 'devicon-amazonwebservices-plain-wordmark colored', color: '#FF9900' },
    'azure': { icon: 'devicon-azure-plain colored', color: '#0089D6' },
    'gcp': { icon: 'devicon-googlecloud-plain colored', color: '#4285F4' },
    'google cloud': { icon: 'devicon-googlecloud-plain colored', color: '#4285F4' },
    'docker': { icon: 'devicon-docker-plain colored', color: '#2496ED' },
    'kubernetes': { icon: 'devicon-kubernetes-plain colored', color: '#326CE5' },
    'k8s': { icon: 'devicon-kubernetes-plain colored', color: '#326CE5' },
    'git': { icon: 'devicon-git-plain colored', color: '#F05032' },
    'github': { icon: 'devicon-github-original', color: '#ffffff' },
    'gitlab': { icon: 'devicon-gitlab-plain colored', color: '#FCA121' },
    'bitbucket': { icon: 'devicon-bitbucket-original colored', color: '#0052CC' },
    'linux': { icon: 'devicon-linux-plain', color: '#FCC624' },
    'ubuntu': { icon: 'devicon-ubuntu-plain colored', color: '#E95420' },
    'jenkins': { icon: 'devicon-jenkins-line colored', color: '#D33833' },
    'github actions': { icon: 'devicon-github-original', color: '#2088FF' },
    'terraform': { icon: 'devicon-terraform-plain colored', color: '#7B42BC' },
    'ansible': { icon: 'devicon-ansible-plain colored', color: '#EE0000' },
    'nginx': { icon: 'devicon-nginx-original colored', color: '#009639' },
    'figma': { icon: 'devicon-figma-plain colored', color: '#F24E1E' },
    'jira': { icon: 'devicon-jira-plain colored', color: '#0052CC' },
    
    // AI & LLMs
    'openai': { icon: 'fa-solid fa-brain', color: '#00A67E' },
    'open ai': { icon: 'fa-solid fa-brain', color: '#00A67E' },
    'chatgpt': { icon: 'fa-solid fa-comment-dots', color: '#00A67E' },
    'anthropic': { icon: 'fa-solid fa-cube', color: '#D97757' },
    'claude': { icon: 'fa-solid fa-cube', color: '#D97757' },
    'gemini': { icon: 'fa-solid fa-sparkles', color: '#1A73E8' },
    'antigravity': { icon: 'fa-solid fa-rocket', color: '#8b5cf6' },
    'llm': { icon: 'fa-solid fa-robot', color: '#0ea5e9' },
    'prompt engineering': { icon: 'fa-solid fa-wand-magic-sparkles', color: '#f59e0b' },
    'ai': { icon: 'fa-solid fa-microchip', color: '#ec4899' },
    'machine learning': { icon: 'fa-solid fa-network-wired', color: '#3b82f6' },
    'ml': { icon: 'fa-solid fa-network-wired', color: '#3b82f6' },
  };

  // 1. Exact match
  if (iconMap[name]) {
    return iconMap[name];
  }

  // 2. Word boundary match
  for (const [key, details] of Object.entries(iconMap)) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\s|-|\\.|_)${escapedKey}($|\\s|-|\\.|_)`, 'i');
    
    if (regex.test(name)) {
      return details;
    }
  }

  // 3. Fallback: Generic icon, but heavily styled with a dynamic, deterministic Hash Color
  return { icon: 'fa-solid fa-code', color: getHashColor(name) };
}

export function getCompanyIcon(companyName: string): { icon: string, color: string, isText: boolean, initials?: string } {
  const name = companyName.toLowerCase().trim();

  const iconMap: Record<string, { icon: string, color: string }> = {
    // Tech Giants
    'google': { icon: 'fa-brands fa-google', color: '#4285F4' },
    'alphabet': { icon: 'fa-brands fa-google', color: '#4285F4' },
    'meta': { icon: 'fa-brands fa-meta', color: '#0668E1' },
    'facebook': { icon: 'fa-brands fa-facebook', color: '#1877F2' },
    'apple': { icon: 'fa-brands fa-apple', color: '#A2AAAD' },
    'amazon': { icon: 'fa-brands fa-amazon', color: '#FF9900' },
    'aws': { icon: 'fa-brands fa-aws', color: '#FF9900' },
    'netflix': { icon: 'fa-solid fa-n', color: '#E50914' },
    'microsoft': { icon: 'fa-brands fa-microsoft', color: '#00A4EF' },
    'github': { icon: 'fa-brands fa-github', color: '#ffffff' },
    'linkedin': { icon: 'fa-brands fa-linkedin', color: '#0A66C2' },
    'twitter': { icon: 'fa-brands fa-x-twitter', color: '#ffffff' },
    'x': { icon: 'fa-brands fa-x-twitter', color: '#ffffff' },
    
    // Tech/SaaS
    'stripe': { icon: 'fa-brands fa-stripe-s', color: '#635BFF' },
    'airbnb': { icon: 'fa-brands fa-airbnb', color: '#FF5A5F' },
    'uber': { icon: 'fa-brands fa-uber', color: '#ffffff' },
    'spotify': { icon: 'fa-brands fa-spotify', color: '#1DB954' },
    'slack': { icon: 'fa-brands fa-slack', color: '#4A154B' },
    'discord': { icon: 'fa-brands fa-discord', color: '#5865F2' },
    'twitch': { icon: 'fa-brands fa-twitch', color: '#9146FF' },
    'figma': { icon: 'fa-brands fa-figma', color: '#F24E1E' },
    'adobe': { icon: 'fa-brands fa-adobe', color: '#FF0000' },
    'salesforce': { icon: 'fa-brands fa-salesforce', color: '#00A1E0' },
    'dropbox': { icon: 'fa-brands fa-dropbox', color: '#0061FF' },
    'atlassian': { icon: 'fa-brands fa-atlassian', color: '#0052CC' },
    'jira': { icon: 'fa-brands fa-jira', color: '#0052CC' },
    'notion': { icon: 'fa-solid fa-n', color: '#ffffff' },
    'canva': { icon: 'fa-solid fa-c', color: '#00C4CC' },
    'shopify': { icon: 'fa-brands fa-shopify', color: '#96BF48' },
    'pinterest': { icon: 'fa-brands fa-pinterest', color: '#E60023' },
    'snapchat': { icon: 'fa-brands fa-snapchat', color: '#FFFC00' },
    'tiktok': { icon: 'fa-brands fa-tiktok', color: '#69C9D0' },
    'reddit': { icon: 'fa-brands fa-reddit', color: '#FF4500' },
    'doordash': { icon: 'fa-solid fa-d', color: '#FF3008' },
    'instacart': { icon: 'fa-solid fa-carrot', color: '#0AAD0A' },
  };

  // 1. Exact or partial match
  for (const [key, details] of Object.entries(iconMap)) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\s|-|\\.|_)${escapedKey}($|\\s|-|\\.|_)`, 'i');
    
    if (regex.test(name)) {
      return { icon: details.icon, color: details.color, isText: false };
    }
  }

  // 2. Fallback: Hash color and initials
  const initials = name ? name.charAt(0).toUpperCase() : '?';
  return { icon: '', color: getHashColor(name || '?'), isText: true, initials };
}
