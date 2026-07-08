function Navbar({ activeSection }) {
    return (
        <nav className="navbar">
            <div className="logo">COSMOS</div>

            <div className="nav-links">
                <a className={activeSection === 'home' ? 'active' : ''} href="#home">
                    Home
                </a>
                <a className={activeSection === 'contact' ? 'active' : ''} href="#contact">
                    API
                </a>
                <a href="/console">
                    Console
                </a>
            </div>
        </nav>
    )
}

export default Navbar
