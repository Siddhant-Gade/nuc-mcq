import styles from './HelpModal.module.css';

interface HelpModalProps {
  onClose: () => void;
}

const sections = [
  {
    title: 'Getting Started',
    items: [
      { q: 'How do I admit a new student?', a: 'Navigate to Students > Admit Student. Fill in the required fields (PRN, name, email, mobile, batch, course) and submit. The student will be added to the selected batch.' },
      { q: 'How do I import students in bulk?', a: 'Go to Import Admissions in the sidebar. Download the CSV template, fill in student data, and upload the file. The system will validate rows and show any errors before importing.' },
      { q: 'How do I create a new batch?', a: 'Navigate to Batches and click "Create Batch". Enter the batch ID, name, institute, and capacity. The batch will be created with ACTIVE status.' },
    ],
  },
  {
    title: 'Student Management',
    items: [
      { q: 'How do I update a student\'s access status?', a: 'Open the student\'s detail page and click "Update Status". You can change the status between PENDING, ACTIVE, EXPIRED, or REVOKED.' },
      { q: 'How do I search for a student?', a: 'Use the search bar at the top of the Student List page, or use the global search in the header to find students by name or PRN.' },
      { q: 'Can I filter students by batch or status?', a: 'Yes. Use the filter dropdowns above the student table to filter by batch, access status, or search by name.' },
    ],
  },
  {
    title: 'Authorization Requests',
    items: [
      { q: 'What are authorization requests?', a: 'When a student registers for the first time, they submit an authorization request. Admins must approve or reject these requests before the student can access the platform.' },
      { q: 'How do I approve or reject a request?', a: 'Go to Authorization Requests, click on a pending request, review the student details, and click Approve or Reject.' },
    ],
  },
  {
    title: 'Account & Settings',
    items: [
      { q: 'How do I change my password?', a: 'Go to Settings > Account section. Click "Change Password" and follow the prompts.' },
      { q: 'How do I switch the interface language?', a: 'Go to Settings > Language and select your preferred language (English, Marathi, or Hindi).' },
      { q: 'How do I change the theme?', a: 'Click the sun/moon icon in the header to toggle between Light, Dark, and System theme modes.' },
    ],
  },
  {
    title: 'Troubleshooting',
    items: [
      { q: 'The page is not loading correctly', a: 'Try refreshing the page (Ctrl+R / Cmd+R). If the issue persists, clear your browser cache or try incognito mode.' },
      { q: 'I cannot log in', a: 'Verify your email and password. If you\'ve forgotten your password, contact the system administrator to reset it.' },
      { q: 'My changes are not saving', a: 'Check your internet connection. If the issue continues, log out and log back in, then try again.' },
    ],
  },
];

export default function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5"/><path d="M7.5 7.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5M10 14.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <h2 className={styles.title}>Help Center</h2>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M13.5 4.5 4.5 13.5M4.5 4.5l9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.intro}>
            <p className={styles.introText}>New Unique Computers — Admin Panel</p>
            <p className={styles.introSub}>Version 1.0.0</p>
          </div>

          {sections.map((section) => (
            <div key={section.title} className={styles.section}>
              <h3 className={styles.sectionTitle}>{section.title}</h3>
              <div className={styles.faqList}>
                {section.items.map((item) => (
                  <details key={item.q} className={styles.faqItem}>
                    <summary className={styles.faqQuestion}>{item.q}</summary>
                    <p className={styles.faqAnswer}>{item.a}</p>
                  </details>
                ))}
              </div>
            </div>
          ))}

          <div className={styles.contact}>
            <h3 className={styles.sectionTitle}>Need More Help?</h3>
            <p className={styles.contactText}>Contact your system administrator or reach out to our support team.</p>
            <div className={styles.contactInfo}>
              <div className={styles.contactRow}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 4l6 4 6-4M2 4v8h12V4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span>support@newuniquecomputers.com</span>
              </div>
              <div className={styles.contactRow}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M14.05 11.1l-2.27-.85a1 1 0 0 0-1.08.3l-.92.92a11.1 11.1 0 0 1-4-4l.92-.92a1 1 0 0 0 .3-1.08L6.16 2.4a1 1 0 0 0-1.01-.5H3a1 1 0 0 0-1 1.05A14.01 14.01 0 0 0 13 14a1 1 0 0 0 1.05-1.01v-2.15a1 1 0 0 0-.5-1.01l.5-.74Z" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span>+91 98765 43210</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
