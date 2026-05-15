import { useAuth } from "@/contexts/AuthContext";
import { NavLink, useNavigate } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import igotLogo from "@/assets/igot-ai-logo.svg";
import { useEffect, useState } from "react";
import HelpDrawer from "@/components/HelpDrawer";
import { ACCESS_TOKEN_2 } from "./ConstantAPI";

const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [openDrawer, setOpenDrawer] = useState(false);
  const [userDetails , setUserDetails] = useState<any>(null);

    useEffect(() => {
      fetchUserDetails();
    }, []);
   const fetchUserDetails = async () => {
     try {
       const response = await fetch(
         '/apis/proxies/v8/api/user/v2/read',
         {
           method: 'GET',
           headers: {
             'Content-Type': 'application/json',
           },
         }
       );  
 
       if (!response.ok) throw new Error('Failed to fetch user details');
       const data = await response.json();
       const userDetails = data?.result?.response;
       setUserDetails(userDetails);
       return data?.result || null;
     } catch (error) {
       console.error('User details fetch error:', error);
       return null;
     }
   };
 const handleLogout = async () => {
   const resetUrl = `/apis/reset`;
    window.location.href = resetUrl;
};
  const navItems = [
    {
      label: "Home",
      path: "/",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"></path>
          <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        </svg>
      ),
    },
    {
      label: "Past Assessments",
      path: "/past-assessments",
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-3.5 h-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
          <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
          <path d="M10 9H8"></path>
          <path d="M16 13H8"></path>
          <path d="M16 17H8"></path>
        </svg>
      ),
    },
  ];

  return (
    <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">

        {/* LEFT SECTION */}
        <div className="flex items-center gap-3">

          {/* Logo */}
          <img src={igotLogo} alt="iGOT AI" className="h-9" />

          {/* Title */}
          <div className="flex flex-col items-center">
            <span className="text-sm font-semibold tracking-tight">
              <span
                className="text-primary font-extrabold italic"
                style={{ fontFamily: "Georgia, serif" }}
              >
                iGOT
              </span>
              <span className="text-muted-foreground font-light mx-1">AI</span>
            </span>

            <span className="hidden sm:inline text-[10px] font-medium text-muted-foreground tracking-wider uppercase">
              Assessment Generator
            </span>
          </div>

        </div>

        {/* RIGHT SECTION */}
        <div className="flex items-center gap-2">
          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6 ml-2">
            {navItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.path}
                className={({ isActive }) =>
                  `relative flex items-center gap-1 text-sm font-medium pb-2 transition-colors
        ${isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {item.icon}
                    {item.label}

                    {/* underline */}
                    <span
                      className={`absolute left-0 bottom-0 h-[2px] bg-primary transition-all duration-300
            ${isActive ? "w-full opacity-100" : "w-0 opacity-0"}`}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:block h-6 w-px bg-border/70 ml-2"></div>


          <button
            onClick={() => setOpenDrawer(true)}
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&amp;_svg]:pointer-events-none [&amp;_svg]:size-4 [&amp;_svg]:shrink-0 w-8 h-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
            type="button"
            aria-haspopup="dialog"
            aria-expanded="false"
            aria-controls="radix-:r2r:"
            data-state="closed"

          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-circle-help w-[18px] h-[18px]"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><path d="M12 17h.01"></path></svg>
          </button>
          {userDetails && (
            <div className="flex items-center gap-3">

              {/* User Name */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-muted/40 border border-border/60 rounded-full">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-user w-3.5 h-3.5 text-primary"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <span className="text-xs font-medium text-foreground">
                  {userDetails?.firstName} {userDetails?.lastName}
                </span>
                <button onClick={handleLogout} className=" rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors p-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-log-out w-3.5 h-3.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" x2="9" y1="12" y2="12"></line></svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {openDrawer &&
        <HelpDrawer
          open={openDrawer}
          onClose={() => setOpenDrawer(false)}
        />}
    </header>
  );
};

export default Header;