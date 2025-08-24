"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, User, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { signOutUser } from "@/lib/auth";

const navigation = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
  { name: "Services", href: "/services" },
  { name: "TTT Canada", href: "/ttt-canada" },
  { name: "Pricing", href: "/pricing" },
  { name: "Contact", href: "/contact" },
];

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setUserMenuOpen(false);
      setMobileMenuOpen(false);
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8" aria-label="Global">
        {/* Logo */}
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5">
            <span className="sr-only">Talk to Text Canada</span>
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-ttt-navy rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">TTT</span>
              </div>
              <span className="text-xl font-bold text-ttt-navy">Talk to Text Canada</span>
            </div>
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>

        {/* Desktop navigation */}
        <div className="hidden lg:flex lg:gap-x-12">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "text-sm font-semibold leading-6 transition-colors",
                pathname === item.href
                  ? "text-ttt-navy"
                  : "text-gray-900 hover:text-ttt-navy"
              )}
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Auth buttons */}
        <div className="hidden lg:flex lg:flex-1 lg:justify-end lg:gap-x-4">
          {user ? (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-x-2"
              >
                <User className="h-4 w-4" />
                <span>{userProfile?.firstName || user.displayName || 'Account'}</span>
              </Button>
              
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-50">
                  <Link
                    href="/dashboard"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    Dashboard
                  </Link>
                  {userProfile?.role === 'admin' && (
                    <>
                      <div className="border-t border-gray-200 my-1"></div>
                      <div className="px-4 py-2 text-xs text-gray-500 font-medium">ADMIN</div>
                      <Link
                        href="/admin"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Admin Dashboard
                      </Link>
                      <Link
                        href="/admin/manual-transcriptions"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Manual Transcriptions
                      </Link>
                      <Link
                        href="/admin/ttt-canada-orders"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        TTT Canada Orders
                      </Link>
                      <Link
                        href="/admin/setup"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        Admin Settings
                      </Link>
                      <div className="border-t border-gray-200 my-1"></div>
                    </>
                  )}
                  <Link
                    href="/settings"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings className="inline h-4 w-4 mr-2" />
                    Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <LogOut className="inline h-4 w-4 mr-2" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/trial">
                <Button variant="outline" size="sm">
                  Try Free
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/register">
                <Button variant="navy" size="sm">
                  Sign up
                </Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-50 bg-white px-6 py-6">
            <div className="flex items-center justify-between">
              <Link href="/" className="-m-1.5 p-1.5" onClick={() => setMobileMenuOpen(false)}>
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 bg-ttt-navy rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">TTT</span>
                  </div>
                  <span className="text-xl font-bold text-ttt-navy">Talk to Text Canada</span>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-gray-500/10">
                <div className="space-y-2 py-6">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7",
                        pathname === item.href
                          ? "text-ttt-navy bg-ttt-lavender-light"
                          : "text-gray-900 hover:bg-gray-50"
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
                <div className="py-6">
                  {user ? (
                    <div className="space-y-2">
                      <Link
                        href="/dashboard"
                        className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/settings"
                        className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Settings
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50 w-full text-left"
                      >
                        Sign out
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Link
                        href="/trial"
                        className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Try Free
                      </Link>
                      <Link
                        href="/login"
                        className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-gray-900 hover:bg-gray-50"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Log in
                      </Link>
                      <Link
                        href="/register"
                        className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-white bg-ttt-navy hover:bg-ttt-navy-light"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        Sign up
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;