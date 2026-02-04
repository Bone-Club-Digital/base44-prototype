import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { LayoutGrid, User as UserIcon, LogOut, ShoppingCart, Users, MessageSquare, Gift, Settings, GraduationCap, Star, LogIn, Calendar, Coins, Package, Shield, ImageIcon } from "lucide-react";
import { User } from '@/entities/User';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserProvider, useUser } from './components/auth/UserProvider';
import { CartProvider, useCart } from './components/shop/CartProvider';
import CartModal from './components/shop/CartModal';
import { RealMoneyCartProvider, useRealMoneyCart } from './components/shop/RealMoneyCartProvider';
import { RealMoneyCartModal } from './components/shop/RealMoneyCartModal';
import UnreadMessagesBadge from './components/layout/UnreadMessagesBadge';

const HamburgerMenuSVG = ({ className }) => (
  <svg
    id="Layer_1"
    xmlns="http://www.w3.org/2000/svg"
    version="1.1"
    viewBox="0 0 55.7 47.4"
    className={className}
  >
    <path fill="#c2b2a3" d="M53.6,24H2.1l51.6-5.5v5.5Z"/>
    <path fill="#6e6157" d="M53.6,7.6H2.1L53.6,2.1v5.5Z"/>
    <path fill="#6e6157" d="M53.6,40.5H2.1l51.6-5.5v5.5Z"/>
    <path fill="#c2b2a3" d="M53.6,24H2.1l51.6,5.5v-5.5Z"/>
    <path fill="#6e6157" d="M53.6,7.6H2.1l51.6,5.5v-5.5Z"/>
    <path fill="#6e6157" d="M53.6,40.5H2.1l51.6,5.5v-5.5Z"/>
    <path fill="#c2b2a3" d="M53.6,24H2.1l51.6-5.5v5.5Z"/>
    <path fill="#c2b2a3" d="M53.6,24H2.1l51.6,5.5v-5.5Z"/>
  </svg>
);

const MobileProfileSVG = ({ className }) => (
  <svg
    id="Layer_1"
    data-name="Layer 1"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 1682.69 1682.69"
    className={className}
  >
    <path fill="#c1b2a3" d="M1204.49,1420.76h-.32c-105.17,66.06-229.37,104.18-362.83,104.18s-257.66-38.12-363.15-104.18l-131.46-107.47c-117-122.58-188.99-288.88-188.99-471.94,0-377.62,305.99-683.59,683.59-683.59s683.59,305.98,683.59,683.59c0,183.06-71.99,349.03-188.99,471.94l-131.46,107.47ZM841.35,1682.69c464.69,0,841.35-376.63,841.35-841.35S1306.03,0,841.35,0,0,376.63,0,841.35s376.66,841.35,841.35,841.35Z"/>
    <path fill="#c1b2a3" d="M1334.65,1315.09c-62.94-153.15-213.54-261-389.14-261h-210.34c-175.6,0-326.25,107.86-389.14,261,39.1,40.99,83.22,76.94,131.41,107.23,24.32-120.19,130.53-210.48,257.73-210.48h210.34c127.21,0,233.42,90.3,257.73,210.48,48.19-30.29,92.3-66.24,131.41-107.23Z"/>
    <path fill="#c1b2a3" d="M841.35,368.09c-159.75,0-289.21,129.49-289.21,289.21s129.46,289.21,289.21,289.21,289.21-129.49,289.21-289.21-129.46-289.21-289.21-289.21ZM841.35,788.76c-72.62,0-131.46-58.83-131.46-131.46s58.84-131.46,131.46-131.46,131.46,58.83,131.46,131.46-58.84,131.46-131.46,131.46Z"/>
  </svg>
);

function AppLayout({ children }) {
  const location = useLocation();
  const logoUrl = "https://base44.app/api/apps/68bdec04f29c5b01c310ac4f/files/public/68bdec04f29c5b01c310ac4f/9d1b74d56_SIMPLE_BONES_SOLID.png";
  const { user, plan, loading: userLoading } = useUser();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Load Daily.co script globally and only once
  useEffect(() => {
    const scriptId = 'daily-co-script';
    if (document.getElementById(scriptId)) {
      return; // Script already exists
    }
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://cdn.jsdelivr.net/npm/@daily-co/daily-js'; // Switched to a more reliable CDN
    script.async = true;
    script.onload = () => console.log('Daily.co script loaded successfully.');
    script.onerror = () => console.error('Failed to load Daily.co script.');
    document.body.appendChild(script);
  }, []);

  const handleLogout = async () => {
    // Clear the user's last_active timestamp before logging out
    if (user) {
      try {
        const { PlayerStats } = await import('@/entities/PlayerStats');
        const stats = await PlayerStats.filter({ user_id: user.id });
        if (stats.length > 0) {
          await PlayerStats.update(stats[0].id, { last_active: null });
        }
      } catch (error) {
        console.warn("Could not clear last_active status on logout:", error.message);
      }
    }
    
    await User.logout();
    window.location.reload();
  };

  const handleLogin = () => {
    User.login();
  };

  const isRedeemBonesPage = location.pathname === createPageUrl("RedeemBones");

  const MobileRealMoneyCartLink = () => {
    const [showCart, setShowCart] = useState(false);
    const { getTotalItems } = useRealMoneyCart();
    const totalItems = getTotalItems();

    const handleClick = () => {
      setShowCart(true);
      setMobileMenuOpen(false); // Close mobile menu when cart is opened
    };

    return (
      <>
        <button
          onClick={handleClick}
          className="flex items-center transition-all duration-200 hover:opacity-80 cursor-pointer text-header-nav"
          style={{ fontFamily: "'Tanker', 'Abolition', 'Oswald', sans-serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '-1px', fontSize: '1.75rem' }}
        >
          <ShoppingCart className="mr-2 h-6 w-6" />
          <span>Premium Cart</span>
          {totalItems > 0 && (
            <span 
              className="ml-2 h-5 w-5 rounded-full text-xs font-bold flex items-center justify-center"
              style={{ backgroundColor: '#007e81', color: '#e5e4cd' }}
            >
              {totalItems > 9 ? '9+' : totalItems}
            </span>
          )}
        </button>
        <RealMoneyCartModal isOpen={showCart} onClose={() => setShowCart(false)} />
      </>
    );
  };

  const MobileBonesCartLink = () => {
    const [showCart, setShowCart] = useState(false);
    const { getTotalItems } = useCart();
    const totalItems = getTotalItems();

    const handleClick = () => {
      setShowCart(true);
      setMobileMenuOpen(false); // Close mobile menu when cart is opened
    };

    return (
      <>
        <button
          onClick={handleClick}
          className="flex items-center transition-all duration-200 hover:opacity-80 cursor-pointer text-header-nav"
          style={{ fontFamily: "'Tanker', 'Abolition', 'Oswald', sans-serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '-1px', fontSize: '1.75rem' }}
        >
          <ShoppingCart className="mr-2 h-6 w-6" />
          <span>Bones Cart</span>
          {totalItems > 0 && (
            <span 
              className="ml-2 h-5 w-5 rounded-full text-xs font-bold flex items-center justify-center"
              style={{ backgroundColor: '#f26222', color: '#e5e4cd' }}
            >
              {totalItems > 9 ? '9+' : totalItems}
            </span>
          )}
        </button>
        <CartModal isOpen={showCart} onClose={() => setShowCart(false)} />
      </>
    );
  };

  const navLinks = (
    <>
        <Link 
            to={createPageUrl("Clubs")} 
            role="button"
            className="flex items-center transition-all duration-200 hover:opacity-80 relative cursor-pointer text-header-nav"
            style={{ fontFamily: "'Tanker', 'Abolition', 'Oswald', sans-serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '-1px', fontSize: '1.75rem' }}
            onClick={() => setMobileMenuOpen(false)}
        >
            <span>Clubs</span>
            {user && <PendingInvitesBadge />}
        </Link>

        {/* BONE CLUB Dropdown */}
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div 
                className="flex items-center transition-all duration-200 hover:opacity-80 cursor-pointer text-header-nav"
                style={{ fontFamily: "'Tanker', 'Abolition', 'Oswald', sans-serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '-1px', fontSize: '1.75rem' }}
              >
                <span>Bone Club</span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Community</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer" onClick={() => setMobileMenuOpen(false)}>
                <Link to={createPageUrl('ClubHouse')} className="flex items-center">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span>Club House Forum</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer" onClick={() => setMobileMenuOpen(false)}>
                <Link to={createPageUrl('MemberDirectory')} className="flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  <span>Member Directory</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer" onClick={() => setMobileMenuOpen(false)}>
                <Link to={createPageUrl('Friends')} className="flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  <span>Friends</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

        {/* Shop Dropdown */}
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div 
                className="flex items-center transition-all duration-200 hover:opacity-80 cursor-pointer text-header-nav"
                style={{ fontFamily: "'Tanker', 'Abolition', 'Oswald', sans-serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '-1px', fontSize: '1.75rem' }}
              >
                <span>Shop</span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">Shopping</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer" onClick={() => setMobileMenuOpen(false)}>
                <Link to={createPageUrl('Shop')} className="flex items-center">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  <span>Premium Shop</span>
                </Link>
              </DropdownMenuItem>
              {user && (
                <DropdownMenuItem asChild className="cursor-pointer" onClick={() => setMobileMenuOpen(false)}>
                  <Link to={createPageUrl('RedeemBones')} className="flex items-center">
                    <Gift className="mr-2 h-4 w-4" />
                    <span>Redeem Bones</span>
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
        </DropdownMenu>
        
        <Link 
            to={createPageUrl("Membership")} 
            role="button"
            className="flex items-center transition-all duration-200 hover:opacity-80 cursor-pointer text-header-nav"
            style={{ fontFamily: "'Tanker', 'Abolition', 'Oswald', sans-serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '-1px', fontSize: '1.75rem' }}
            onClick={() => setMobileMenuOpen(false)}
        >
            <span>Membership</span>
        </Link>
        
        {user && user.role === 'admin' && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div 
                  className="flex items-center transition-all duration-200 hover:opacity-80 cursor-pointer text-header-nav"
                  style={{ fontFamily: "'Tanker', 'Abolition', 'Oswald', sans-serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '-1px', fontSize: '1.75rem' }}
                >
                  <span>Admin</span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Administration</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer" onClick={() => setMobileMenuOpen(false)}>
                  <Link to={createPageUrl('Admin')} className="flex items-center">
                    <Shield className="mr-2 h-4 w-4" />
                    <span>Admin Dashboard</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer" onClick={() => setMobileMenuOpen(false)}>
                  <Link to={createPageUrl('ManageClubHouse')} className="flex items-center">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <span>Manage Club House</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer" onClick={() => setMobileMenuOpen(false)}>
                  <Link to={createPageUrl('AdminOrders')} className="flex items-center">
                    <Package className="mr-2 h-4 w-4" />
                    <span>Order Management</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer" onClick={() => setMobileMenuOpen(false)}>
                  <Link to={createPageUrl('AdminProducts')} className="flex items-center">
                    <Package className="mr-2 h-4 w-4" />
                    <span>Manage Products</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer" onClick={() => setMobileMenuOpen(false)}>
                  <Link to={createPageUrl('AdminUsers')} className="flex items-center">
                    <Users className="mr-2 h-4 w-4" />
                    <span>Manage Users</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer" onClick={() => setMobileMenuOpen(false)}>
                    <Link to={createPageUrl('AdminMedia')} className="flex items-center">
                        <ImageIcon className="mr-2 h-4 w-4" />
                        <span>Media Library</span>
                    </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        )}

        {user && !user.role && user.is_forum_admin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div 
                  className="flex items-center transition-all duration-200 hover:opacity-80 cursor-pointer text-header-nav"
                  style={{ fontFamily: "'Tanker', 'Abolition', 'Oswald', sans-serif", fontWeight: 400, textTransform: 'uppercase', letterSpacing: '-1px', fontSize: '1.75rem' }}
                >
                  <span>Admin</span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Forum Administration</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="cursor-pointer" onClick={() => setMobileMenuOpen(false)}>
                  <Link to={createPageUrl('ManageClubHouse')} className="flex items-center">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <span>Manage Club House</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        )}
    </>
  );

  return (
    <CartProvider>
      <RealMoneyCartProvider>
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#e5e4cd' }}>
          <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;700&display=swap');
            
            @font-face {
              font-family: 'Abolition';
              src: url('https://boneclub.co.uk/BASE44_ASSETS/FONTS/AbolitionTest-Regular.otf') format('opentype');
              font-weight: normal;
              font-style: normal;
              font-display: swap;
            }
            
            @font-face {
                font-family: 'Tanker';
                src: url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/Tanker-Regular.woff2') format('woff2'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/Tanker-Regular.woff') format('woff'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/Tanker-Regular.ttf') format('truetype'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/Tanker-Regular.eot') format('embedded-opentype');
                font-weight: normal;
                font-style: normal;
                font-display: swap;
            }
            
            /* BespokeSerif Font Family - Light */
            @font-face {
                font-family: 'BespokeSerif';
                src: url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-Light.woff2') format('woff2'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-Light.woff') format('woff'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-Light.ttf') format('truetype'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-Light.eot') format('embedded-opentype');
                font-weight: 300;
                font-style: normal;
                font-display: swap;
            }
            
            /* BespokeSerif Font Family - Light Italic */
            @font-face {
                font-family: 'BespokeSerif';
                src: url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-LightItalic.woff2') format('woff2'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-LightItalic.woff') format('woff'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-LightItalic.ttf') format('truetype'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-LightItalic.eot') format('embedded-opentype');
                font-weight: 300;
                font-style: italic;
                font-display: swap;
            }
            
            /* BespokeSerif Font Family - Regular */
            @font-face {
                font-family: 'BespokeSerif';
                src: url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-Regular.woff2') format('woff2'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-Regular.woff') format('woff'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-Regular.ttf') format('truetype'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-Regular.eot') format('embedded-opentype');
                font-weight: 400;
                font-style: normal;
                font-display: swap;
            }
            
            /* BespokeSerif Font Family - Regular Italic */
            @font-face {
                font-family: 'BespokeSerif';
                src: url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-Italic.woff2') format('woff2'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-Italic.woff') format('woff'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-Italic.ttf') format('truetype'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-Italic.eot') format('embedded-opentype');
                font-weight: 400;
                font-style: italic;
                font-display: swap;
            }
            
            /* BespokeSerif Font Family - Medium */
            @font-face {
                font-family: 'BespokeSerif';
                src: url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-Medium.woff2') format('woff2'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-Medium.woff') format('woff'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-Medium.ttf') format('truetype'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-Medium.eot') format('embedded-opentype');
                font-weight: 500;
                font-style: normal;
                font-display: swap;
            }
            
            /* BespokeSerif Font Family - Medium Italic */
            @font-face {
                font-family: 'BespokeSerif';
                src: url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-MediumItalic.woff2') format('woff2'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-MediumItalic.woff') format('woff'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-MediumItalic.ttf') format('truetype'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-MediumItalic.eot') format('embedded-opentype');
                font-weight: 500;
                font-style: italic;
                font-display: swap;
            }
            
            /* BespokeSerif Font Family - Bold */
            @font-face {
                font-family: 'BespokeSerif';
                src: url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-Bold.woff2') format('woff2'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-Bold.woff') format('woff'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-Bold.ttf') format('truetype'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-Bold.eot') format('embedded-opentype');
                font-weight: 700;
                font-style: normal;
                font-display: swap;
            }
            
            /* BespokeSerif Font Family - Bold Italic */
            @font-face {
                font-family: 'BespokeSerif';
                src: url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-BoldItalic.woff2') format('woff2'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-BoldItalic.woff') format('woff'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-BoldItalic.ttf') format('truetype'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-BoldItalic.eot') format('embedded-opentype');
                font-weight: 700;
                font-style: italic;
                font-display: swap;
            }
            
            /* BespokeSerif Font Family - Extrabold */
            @font-face {
                font-family: 'BespokeSerif';
                src: url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-Extrabold.woff2') format('woff2'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-ExtraboldItalic.woff') format('woff'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-Extrabold.ttf') format('truetype'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-Extrabold.eot') format('embedded-opentype');
                font-weight: 800;
                font-style: normal;
                font-display: swap;
            }
            
            /* BespokeSerif Font Family - Extrabold Italic */
            @font-face {
                font-family: 'BespokeSerif';
                src: url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-ExtraboldItalic.woff2') format('woff2'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-ExtraboldItalic.woff') format('woff'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-ExtraboldItalic.ttf') format('truetype'),
                     url('https://www.boneclub.co.uk/BASE44_ASSETS/FONTS/BespokeSerif-ExtraboldItalic.eot') format('embedded-opentype');
                font-weight: 800;
                font-style: italic;
                font-display: swap;
            }
            
            :root {
              --header-bg: #007e81;
              --main-bg: #e5e4cd;
              --heading-color: #5a3217;
              --highlight-color: #f26222;
              --tool-bg: #9fd3ba;
              --text-primary: #5a3217;
            }
            
            .header-gradient {
              background: #EFEFE1;
            }

            .text-bone-color {
              color: #e5e4cd;
            }
            
            .text-header-nav {
              color: #6c533c;
            }

            .text-bone-color-faded {
              color: rgba(229, 228, 205, 0.7);
            }

            .hover-text-bone-color:hover {
              color: #e5e4cd;
            }
            
            .highlight-accent {
              background: #f26222;
            }
            
            .tool-card-bg {
              background: #9fd3ba;
            }
            
            .elegant-shadow {
              box-shadow: 0 8px 32px rgba(0, 126, 129, 0.15);
            }
            
            .font-oswald {
              font-family: 'Oswald', sans-serif;
            }

            .font-abolition {
              font-family: 'Abolition', 'Tanker', 'Oswald', sans-serif;
              font-weight: normal;
              text-transform: uppercase;
              text-shadow: none;
              -webkit-text-stroke: 0;
            }

            /* All heading elements use TANKER font */
            h1, h2, h3, h4, h5, h6 {
                font-family: 'Tanker', 'Abolition', 'Oswald', sans-serif !important;
                font-weight: 400 !important;
                text-transform: uppercase !important;
            }

            /* Adjusting heading sizes to make h3 larger while maintaining hierarchy */
            h3 {
                font-size: 1.875rem !important;
                line-height: 2.25rem !important;
            }

            main a {
                color: #007e81;
                text-decoration: underline;
                text-decoration-offset: 2px;
                transition: color 0.2s ease-in-out;
            }
            main a:hover {
                color: #005f61;
            }
            
            .main-text {
              color: #5a3217;
            }
            
            .highlight-text {
              color: #f26222;
            }

            /* Global override for all outline/secondary buttons */
            button[data-variant="outline"],
            button[class*="variant-outline"],
            .btn-variant-outline,
            button:not([style*="background"]):not([class*="destructive"]):not([class*="ghost"]):not([disabled]):not([class*="default"]) {
              background-color: #e5e4cd !important;
              border: none !important;
              color: #5a3217 !important;
              text-decoration: none !important;
            }

            button[data-variant="outline"]:hover,
            button[class*="variant-outline"]:hover,
            .btn-variant-outline:hover,
            button:not([style*="background"]):not([class*="destructive"]):not([class*="ghost"]):not([disabled]):not([class*="default"]):hover {
              background-color: rgba(229, 228, 205, 0.8) !important;
              border: none !important;
              color: #5a3217 !important;
              text-decoration: none !important;
            }

            button[data-variant="outline"]:disabled,
            button[class*="variant-outline"]:disabled,
            .btn-variant-outline:disabled,
            button:disabled {
              background-color: rgba(229, 228, 205, 0.5) !important;
              border: none !important;
              color: rgba(90, 50, 23, 0.5) !important;
              cursor: not-allowed !important;
            }

            /* Specific targeting for shadcn buttons - fixed syntax error for items-center */
            .inline-flex.items-center.justify-center.whitespace-nowrap.rounded-md.text-sm.font-medium.ring-offset-background.transition-colors.focus-visible\\:outline-none.focus-visible\\:ring-2.focus-visible\\:ring-ring.focus-visible\\:ring-offset-2.disabled\\:pointer-events-none.disabled\\:opacity-50.border.border-input.bg-background.hover\\:bg-accent.hover\\:text-accent-foreground {
              background-color: #e5e4cd !important;
              border: none !important;
              color: #5a3217 !important;
              text-decoration: none !important;
            }

            .inline-flex.items-center.justify-center.whitespace-nowrap.rounded-md.text-sm.font-medium.ring-offset-background.transition-colors.focus-visible\\:outline-none.focus-visible\\:ring-2.focus-visible\\:ring-ring.focus-visible\\:ring-offset-2.disabled\\:pointer-events-none.disabled\\:opacity-50.border.border-input.bg-background.hover\\:bg-accent.hover\\:text-accent-foreground:hover {
              background-color: rgba(229, 228, 205, 0.8) !important;
              border: none !important;
              color: #5a3217 !important;
              text-decoration: none !important;
            }

            /* Links inside buttons should not be underlined */
            button a, .btn a, [role="button"] a {
              text-decoration: none !important;
              color: inherit !important;
            }

            button a:hover, .btn a:hover, [role="button"] a:hover {
              text-decoration: none !important;
              color: inherit !important;
            }

            /* Legacy support for older button classes */
            .btn-outline, .button-outline {
              background-color: #e5e4cd !important;
              border: none !important;
              color: #5a3217 !important;
              text-decoration: none !important;
            }

            .btn-outline:hover, .button-outline:hover {
              background-color: rgba(229, 228, 205, 0.8) !important;
              border: none !important;
              color: #5a3217 !important;
              text-decoration: none !important;
            }

            .btn-outline:disabled, .button-outline:disabled {
              background-color: rgba(229, 228, 205, 0.5) !important;
              border: none !important;
              color: rgba(90, 50, 23, 0.5) !important;
              text-decoration: none !important;
            }
          `}</style>
          
          <header className="header-gradient">
            <div className="max-w-7xl mx-auto px-4 py-4">
              
              {/* Mobile Layout */}
              <div className="md:hidden">
                {/* Header Bar: Hamburger | Logo | Profile/Login */}
                <div className="flex items-center justify-between">
                  {/* Left: Hamburger Menu */}
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
                    className="hover:opacity-70 transition-opacity bg-transparent border-none p-0 cursor-pointer"
                    style={{ backgroundColor: 'transparent' }}
                  >
                    <HamburgerMenuSVG className="h-9 w-9" />
                  </button>
                  
                  {/* Center: Logo */}
                  <Link to={createPageUrl("Home")} className="inline-block h-14">
                    <img
                      src={logoUrl}
                      alt="Bone Club Logo"
                      className="h-full object-contain"
                    />
                  </Link>
                  
                  {/* Right: Profile Avatar or Login */}
                  <div>
                    {user ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button 
                            className="relative mt-2 hover:opacity-70 transition-opacity bg-transparent border-none p-0 cursor-pointer"
                            style={{ backgroundColor: 'transparent' }}
                          >
                            <MobileProfileSVG className="h-8 w-8" />
                            <UnreadMessagesBadge className="absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs font-bold flex items-center justify-center border-2 border-[#EFEFE1]" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                          <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-2">
                              <p className="text-sm font-medium leading-none">{user.username || user.full_name}</p>
                              <p className="text-xs leading-none text-muted-foreground">
                                {user.email}
                              </p>
                               <div className="flex items-center gap-2 pt-1">
                                  <span className="font-bold text-lg">🦴</span>
                                  <span className="text-sm font-semibold">{user.bones_balance || 0} Bones</span>
                              </div>
                            </div>
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild className="cursor-pointer">
                            <Link to={createPageUrl('Profile')} className="flex items-center">
                              <UserIcon className="mr-2 h-4 w-4" />
                              <span>Profile</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="cursor-pointer">
                            <Link to={createPageUrl('ManageBones')} className="flex items-center">
                              <Coins className="mr-2 h-4 w-4" />
                              <span>Manage Bones</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="cursor-pointer">
                            <Link to={createPageUrl('MyGames')} className="flex items-center relative">
                              <Calendar className="mr-2 h-4 w-4" />
                              <span>My Games</span>
                              {user && <LeagueProposalsBadge />}
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="cursor-pointer">
                            <Link to={createPageUrl('MyPositions')} className="flex items-center">
                              <ImageIcon className="mr-2 h-4 w-4" />
                              <span>My Positions</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild className="cursor-pointer">
                            <Link to={createPageUrl('Messages')} className="flex items-center">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            <span>Messages</span>
                            <UnreadMessagesBadge />
                          </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : (
                      <Button onClick={() => User.login()} size="sm" style={{ backgroundColor: '#f26222', color: 'white' }} className="uppercase text-xs px-3">
                        Login
                      </Button>
                    )}
                  </div>
                </div>

                {mobileMenuOpen && (
                    <nav className="flex flex-col items-center space-y-4 py-4 mt-4 border-t border-black/20">
                        {navLinks}
                        {user && <MobileRealMoneyCartLink />}
                        {user && isRedeemBonesPage && <MobileBonesCartLink />}
                    </nav>
                )}
              </div>

              {/* Desktop Layout */}
              <div className="hidden md:flex items-center justify-between">
                {/* Logo on the left */}
                <div>
                  <Link to={createPageUrl("Home")} className="inline-block h-20">
                    <img
                      src={logoUrl}
                      alt="Bone Club Logo"
                      className="h-full object-contain"
                    />
                  </Link>
                </div>
                
                {/* Desktop Nav */}
                <nav className="flex items-center space-x-6 md:space-x-8">
                  {navLinks}

                  {user && (
                    <div 
                      className="flex items-center gap-2 px-3 py-2 rounded-lg h-10"
                      style={{ backgroundColor: '#f26222', zIndex: 10 }}
                    >
                      <span className="font-bold text-lg" style={{ color: '#e5e4cd' }}>🦴</span>
                      <span className="font-bold text-lg" style={{ color: '#e5e4cd' }}>{user.bones_balance || 0}</span>
                    </div>
                  )}
                  
                  {user && <RealMoneyCartIcon />}
                  {user && isRedeemBonesPage && <CartIcon />}
                  
                  {user ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          className="relative h-20 w-20 rounded-full hover:bg-black/10 p-0"
                          style={{ backgroundColor: user.profile_picture_url ? 'transparent' : 'rgba(0,0,0,0.05)' }}
                        >
                          {user.profile_picture_url ? (
                            <img
                              src={user.profile_picture_url}
                              alt={user.username || user.full_name}
                              className="h-20 w-20 rounded-full object-cover"
                            />
                          ) : (
                            <UserIcon className="h-12 w-12" style={{ color: '#5a3217' }} />
                          )}
                          <UnreadMessagesBadge className="absolute top-1 right-1 h-6 w-6 rounded-full text-xs font-bold flex items-center justify-center border-2 border-[#EFEFE1]" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                          <div className="flex flex-col space-y-2">
                            <p className="text-sm font-medium leading-none">{user.username || user.full_name}</p>
                            <p className="text-xs leading-none text-muted-foreground">
                              {user.email}
                            </p>
                             <div className="flex items-center gap-2 pt-1">
                                <span className="font-bold text-lg">🦴</span>
                                <span className="text-sm font-semibold">{user.bones_balance || 0} Bones</span>
                            </div>
                          </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild className="cursor-pointer">
                          <Link to={createPageUrl('Profile')} className="flex items-center">
                            <UserIcon className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="cursor-pointer">
                          <Link to={createPageUrl('ManageBones')} className="flex items-center">
                            <Coins className="mr-2 h-4 w-4" />
                            <span>Manage Bones</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="cursor-pointer">
                          <Link to={createPageUrl('MyGames')} className="flex items-center relative">
                            <Calendar className="mr-2 h-4 w-4" />
                            <span>My Games</span>
                            {user && <LeagueProposalsBadge />}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="cursor-pointer">
                          <Link to={createPageUrl('MyPositions')} className="flex items-center">
                            <ImageIcon className="mr-2 h-4 w-4" />
                            <span>My Positions</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="cursor-pointer">
                          <Link to={createPageUrl('Messages')} className="flex items-center">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            <span>Messages</span>
                            <UnreadMessagesBadge />
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="cursor-pointer">
                          <Link to={createPageUrl('MyOrders')} className="flex items-center">
                            <Package className="mr-2 h-4 w-4" />
                            <span>My Orders</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                          <LogOut className="mr-2 h-4 w-4" />
                          <span>Log out</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Button onClick={() => User.login()} style={{ backgroundColor: '#f26222', color: 'white' }} className="uppercase">
                      Login to Play
                    </Button>
                  )}
                </nav>
              </div>
            </div>
          </header>

          <main className="flex-1">
            {children}
          </main>

          <footer style={{ backgroundColor: '#007e81' }} className="border-t border-gray-600 py-6">
            <div className="max-w-7xl mx-auto px-4 text-center text-bone-color">
              <p>© 2024 Bone Club. Master the art of backgammon.</p>
            </div>
          </footer>
        </div>
      </RealMoneyCartProvider>
    </CartProvider>
  );
}

function CartIcon() {
  const [showCart, setShowCart] = useState(false);
  const { getTotalItems } = useCart();
  
  const totalItems = getTotalItems();

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setShowCart(true)}
        className="relative h-10 w-10 rounded-full hover:bg-black/10"
        style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
      >
        <ShoppingCart className="w-6 h-6" style={{ color: '#5a3217' }} />
        {totalItems > 0 && (
          <span 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs font-bold flex items-center justify-center"
            style={{ backgroundColor: '#f26222', color: '#e5e4cd' }}
          >
            {totalItems > 9 ? '9+' : totalItems}
          </span>
        )}
      </Button>
      
      <CartModal isOpen={showCart} onClose={() => setShowCart(false)} />
    </>
  );
}

function RealMoneyCartIcon() {
  const [showCart, setShowCart] = useState(false);
  const { getTotalItems } = useRealMoneyCart();
  
  const totalItems = getTotalItems();

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setShowCart(true)}
        className="relative h-10 w-10 rounded-full hover:bg-black/10"
        style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
      >
        <ShoppingCart className="w-6 h-6" style={{ color: '#5a3217' }} />
        {totalItems > 0 && (
          <span 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs font-bold flex items-center justify-center"
            style={{ backgroundColor: '#007e81', color: '#e5e4cd' }}
          >
            {totalItems > 9 ? '9+' : totalItems}
          </span>
        )}
      </Button>
      
      <RealMoneyCartModal isOpen={showCart} onClose={() => setShowCart(false)} />
    </>
  );
}

function PendingInvitesBadge() {
  const { pendingInvitesCount } = useUser();

  if (pendingInvitesCount === 0) return null;

  return (
    <span 
      className="absolute -top-1 -right-1 h-5 w-5 rounded-full text-xs font-bold flex items-center justify-center"
      style={{ backgroundColor: '#f26222', color: '#e5e4cd' }}
    >
      {pendingInvitesCount > 9 ? '9+' : pendingInvitesCount}
    </span>
  );
}

function LeagueProposalsBadge() {
  const { leagueProposalsCount } = useUser();

  if (leagueProposalsCount === 0) return null;

  return (
    <span 
      className="ml-auto h-5 w-5 rounded-full text-xs font-bold flex items-center justify-center"
      style={{ backgroundColor: '#f26222', color: '#e5e4cd' }}
    >
      {leagueProposalsCount > 9 ? '9+' : leagueProposalsCount}
    </span>
  );
}

export default function Layout({ children }) {
  return (
    <UserProvider>
      <AppLayout>{children}</AppLayout>
    </UserProvider>
  )
}