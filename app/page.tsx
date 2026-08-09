import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="landing">
      <div className="landing-inner">
        <h1>Nightline</h1>
        <p>
          18+ unfiltered AI sex chat. Real-looking companions — women, men, gay,
          lesbian &amp; more. Three talk levels. Level 3 is fully unrestricted.
          Media, voice notes, roleplays, and admin-controlled credits.
        </p>
        <div className="feature-row">
          <span>3 unrestricted levels</span>
          <span>Roleplays</span>
          <span>Media share</span>
          <span>Voice notes &amp; calls</span>
          <span>Admin live chat view</span>
        </div>
        <div className="landing-actions">
          <Link className="btn btn-primary" href="/signup">
            Sign up
          </Link>
          <Link className="btn" href="/login">
            Log in
          </Link>
          <Link className="btn btn-sm" href="/admin">
            Admin
          </Link>
        </div>
        <p className="footer-note" style={{ marginTop: 28 }}>
          Adults 18+ only · No underage content · Characters are 21+
        </p>
      </div>
    </div>
  );
}
