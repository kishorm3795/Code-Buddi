const API_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL !== undefined
  ? import.meta.env.VITE_API_GATEWAY_URL
  : '';

export const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL !== undefined
  ? import.meta.env.VITE_BACKEND_API_URL
  : API_BASE_URL;

export const GENAI_API_URL = import.meta.env.VITE_GEMINI_API_URL !== undefined
  ? import.meta.env.VITE_GEMINI_API_URL
  : (API_BASE_URL ? `${API_BASE_URL}/ai` : '/ai');

export const TEMP_SHARE_API_URL = import.meta.env.VITE_TEMP_SHARE_URL !== undefined
  ? import.meta.env.VITE_TEMP_SHARE_URL
  : (API_BASE_URL ? `${API_BASE_URL}/share` : '/share');

export const LOCAL_STORAGE_USERNAME_KEY = '__username__';
export const LOCAL_STORAGE_TOKEN_KEY = '__token__';
export const LOCAL_STORAGE_LOGIN_KEY = '__login__';
export const LOCAL_STORAGE_THEME_KEY = '__theme__';
export const LOCAL_STORAGE_GOOGLE_USER = '__google__';

export const SESSION_STORAGE_SHARELINKS_KEY = '__sharelinks__';
export const SESSION_STORAGE_FETCH_STATUS_KEY = '__fetchstatus__';

export const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{5,30}$/;
export const EMAIL_REGEX = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
export const PASSWORD_REGEX = /^.{8,}$/;

export const MAX_OTP_ATTEMPTS = 5;
export const OTP_COOLDOWN_SECONDS = 30;

export const RESERVED_USERNAMES = [
  'admin', 'root', 'support', 'system', 'null', 'undefined',
  'moderator', 'mod', 'administrator', 'webmaster', 'contact',
  'help', 'about', 'info', 'owner', 'superuser', 'staff', 'api',
  'account', 'user', 'users', 'me', 'you', 'settings', 'config',
  'dashboard', 'login', 'logout', 'register', 'signup', 'signin',
  'signout', 'profile', 'home', 'security', 'terms', 'privacy',
  'tos', 'faq', 'feedback', 'reports', 'report', 'adminpanel',
  'console', 'auth', 'v1', 'v2', 'internal', 'public', 'private',
  'guest', 'anonymous', 'developer', 'dev', 'ops', 'beta', 'test',
  'testing', 'demo', 'rootadmin', 'superadmin', 'sysadmin',
  'master', 'operator', 'staffer', 'moderat0r', 'founder', 'ceo',
  'cto', 'cfo', 'coo', 'hr', 'securityteam', 'supportteam',
  'billing', 'payments', 'invoice', 'shop', 'store', 'cart',
  'checkout', 'subscribe', 'unsubscribe', 'apiadmin', 'apikey',
  'service', 'systemadmin', 'nulluser', 'undefineduser',
  'supervisor', 'manager', 'leader', 'team', 'project', 'partner',
  'affiliate', 'marketing', 'sales', 'contactus', 'post', 'posts',
  'article', 'articles', 'news', 'blog', 'blogs', 'events',
  'calendar', 'schedule', 'status', 'error', 'errors', 'bug',
  'bugs', 'patch', 'update', 'upgrade', 'downgrade', 'version',
  'release', 'devops', 'analytics', 'stats', 'statistics',
  'metrics', 'metricsadmin', 'adminstats', 'supportdesk',
  'helpline', 'helpdesk', 'moderation', 'moderate',
  'usersupport', 'client', 'clients', 'customer', 'customers',
  'apiuser', 'systemuser', 'bot', 'bots', 'crawler', 'spider',
  'seo', 'spam', 'phishing', 'blacklist', 'whitelist', 'admin123',
  'testuser', 'demoaccount', 'trial', 'betauser', 'alpha',
  'alphatest', 'sandbox', 'sandboxuser', 'readonly', 'readwrite',
  'writeonly', 'masterkey', 'access', 'permission', 'permissions',
  'role', 'roles', 'group', 'groups', 'cron', 'daemon', 'task',
  'jobs', 'worker', 'queue', 'scheduler', 'cache', 'temp', 'tmp',
  'backup', 'restore', 'http', 'https', 'ftp', 'ssh', 'smtp',
  'pop3', 'imap', 'dns', 'tcp', 'udp', 'ip', 'json', 'xml', 'csv',
  'html', 'css', 'js', 'javascript', 'node', 'npm', 'yarn', 'fatal',
  'panic', 'crash', 'fail', 'failure', 'exception', 'bugreport',
  'trace', 'stack', 'overflow', 'memory', 'analyst', 'consultant',
  'engineer', 'designer', 'architect', 'tester', 'qa', 'qaengineer',
  'nullify', 'void', 'undefinedvariable', 'delete', 'remove',
  'drop', 'truncate', 'rootuser', 'super', 'god', 'admin1', 'julia',
  'administrator1', 'sys', 'jspython', 'cc++', 'c#', 'rust', 'go',
  'verilog', 'sql', 'mongodb', 'swift', 'ruby', 'typescript', 'dart',
  'kotlin', 'perl', 'scala'
];

export const VALIDATION_MESSAGES = {
  USERNAME_INVALID: 'Username can only contain letters, numbers, underscores, hyphens, and periods (5-30 characters).',
  USERNAME_RESERVED: 'This username is reserved. Please choose another one.',
  USERNAME_LENGTH: 'Username should be between 5 and 30 characters',
  EMAIL_INVALID: 'Invalid email format',
  PASSWORD_SHORT: 'Password must be at least 8 characters long',
  PASSWORD_INVALID: 'Invalid password format',
  RATE_LIMITED: 'Too many requests. Please wait a few minutes before trying again.',
  OTP_INVALID: 'Invalid OTP',
  OTP_EXPIRED_OR_TOO_MANY_ATTEMPTS: 'Too many failed attempts. This OTP has been invalidated. Please request a new OTP.',
};

export const MAX_SIZE = 0.5 * 1024 * 1024;