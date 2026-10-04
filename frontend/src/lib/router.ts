import type { TabType } from '../types';

/**
 * Canonical URL path for each application Tab.
 * Guarantees a 1-to-1 mapping between application tabs and browser URLs.
 */
export const TAB_TO_ROUTE: Record<TabType, string> = {
  'dashboard': '/dashboard',
  'student-assignments': '/assignments',
  'student-solve': '/solve',
  'student-result': '/results',
  'tutor': '/tutor',
  'study': '/study',
  'focus': '/focus',
  'assessment': '/scan',
  'analytics': '/progress',
  'settings': '/settings',
  'profile': '/profile',
  'teacher-dashboard': '/teacher/dashboard',
  'teacher-assignments': '/teacher/assignments',
  'teacher-review': '/teacher/review',
  'teacher-analytics': '/teacher/analytics',
};

/**
 * Teacher-specific routes (forbidden for students)
 */
export const TEACHER_ROUTES = [
  '/teacher',
  '/teacher/dashboard',
  '/teacher-dashboard',
  '/teacher/assignments',
  '/teacher-assignments',
  '/teacher/review',
  '/teacher-review',
  '/teacher/analytics',
  '/teacher-analytics',
];

/**
 * Student-specific routes (forbidden for teachers)
 */
export const STUDENT_ROUTES = [
  '/dashboard',
  '/assignments',
  '/student-assignments',
  '/my-assignments',
  '/solve',
  '/student-solve',
  '/results',
  '/student-result',
  '/my-results',
  '/tutor',
  '/ai-tutor',
  '/study',
  '/study-materials',
  '/focus',
  '/focus-mode',
  '/progress',
  '/analytics',
  '/my-progress',
];

/**
 * Auth-only routes that render outside authenticated layouts.
 */
export const AUTH_ROUTES = [
  '/login',
  '/signup',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
];

export function isAuthRoute(pathname: string): boolean {
  const clean = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  return AUTH_ROUTES.includes(clean);
}

export function isTeacherRoute(pathname: string): boolean {
  const clean = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  return TEACHER_ROUTES.includes(clean) || clean.startsWith('/teacher');
}

export function isStudentRoute(pathname: string): boolean {
  const clean = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  return STUDENT_ROUTES.includes(clean);
}

/**
 * Known route aliases and path mappings to TabType.
 */
const ROUTE_TO_TAB: Record<string, TabType> = {
  '/': 'dashboard',
  '/home': 'dashboard',
  '/dashboard': 'dashboard',
  '/assignments': 'student-assignments',
  '/student-assignments': 'student-assignments',
  '/my-assignments': 'student-assignments',
  '/solve': 'student-solve',
  '/student-solve': 'student-solve',
  '/results': 'student-result',
  '/student-result': 'student-result',
  '/my-results': 'student-result',
  '/tutor': 'tutor',
  '/ai-tutor': 'tutor',
  '/study': 'study',
  '/study-materials': 'study',
  '/focus': 'focus',
  '/focus-mode': 'focus',
  '/scan': 'assessment',
  '/assessment': 'assessment',
  '/scan-assessment': 'assessment',
  '/progress': 'analytics',
  '/analytics': 'analytics',
  '/my-progress': 'analytics',
  '/settings': 'settings',
  '/profile': 'profile',
  '/me': 'profile',
  '/teacher': 'teacher-dashboard',
  '/teacher/dashboard': 'teacher-dashboard',
  '/teacher-dashboard': 'teacher-dashboard',
  '/teacher/assignments': 'teacher-assignments',
  '/teacher-assignments': 'teacher-assignments',
  '/teacher/review': 'teacher-review',
  '/teacher-review': 'teacher-review',
  '/teacher/analytics': 'teacher-analytics',
  '/teacher-analytics': 'teacher-analytics',
};

/**
 * Convert any browser pathname to its corresponding TabType with strict role validation.
 */
export function routeToTab(pathname: string, userRole?: string): TabType {
  const clean = pathname.toLowerCase().replace(/\/+$/, '') || '/';
  
  // Default home per role
  if (clean === '/') {
    return userRole === 'teacher' ? 'teacher-dashboard' : 'dashboard';
  }

  // Student trying to access teacher route -> redirect to student dashboard
  if (userRole === 'student' && isTeacherRoute(clean)) {
    return 'dashboard';
  }

  // Teacher trying to access student-only route -> redirect to teacher dashboard
  if (userRole === 'teacher' && isStudentRoute(clean)) {
    return 'teacher-dashboard';
  }

  return ROUTE_TO_TAB[clean] || (userRole === 'teacher' ? 'teacher-dashboard' : 'dashboard');
}

/**
 * Convert TabType to its canonical URL path.
 */
export function tabToRoute(tab: TabType): string {
  return TAB_TO_ROUTE[tab] || '/dashboard';
}

/**
 * Push state to browser history and notify listeners.
 */
export function navigateTo(path: string): void {
  if (typeof window !== 'undefined' && window.location.pathname !== path) {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new Event('popstate'));
  }
}
