function Navbar({ activeSection }) {
    return (
        <nav className="navbar">
            <div className="logo">COSMOS</div>

            <div className="nav-links">
                <a className={activeSection === 'home' ? 'active' : ''} href="#home">
                    Home
                </a>
                <a className={activeSection === 'mission' ? 'active' : ''} href="#mission">
                    Mission
                </a>
                <a className={activeSection === 'galaxy' ? 'active' : ''} href="#galaxy">
                    Galaxy
                </a>
                <a className={activeSection === 'contact' ? 'active' : ''} href="#contact">
                    API
                </a>
            </div>
        </nav>
    )
}

export default Navbar
