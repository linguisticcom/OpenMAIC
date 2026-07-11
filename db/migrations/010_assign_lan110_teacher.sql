-- Keep the checked-in ESILV teacher account aligned with the LAN110 assignment.
UPDATE course_assignments
SET teacher_user_id = 'user-esilv-teacher'
WHERE course_id = 'course-lan110-corporate-finance'
  AND organization_id = 'org-esilv';
