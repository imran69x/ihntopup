import { CreditCard, Telegram } from "lucide-react";
import Link from "next/link";
import { FacebookIcon, YoutubeIcon, InstagramIcon, TelegramIcon } from "@/components/icons";
import Image from "next/image";

export default function Footer() {
    return (
        <footer className="bg-[#1C2534] text-white">
            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div>
                        <div className="mb-4">
                           <div className="inline-block p-2 bg-white/10 rounded-xl border border-white/20 backdrop-blur-sm shadow-lg">
                                <Link href="/">
                                    <Image src="https://i.imgur.com/bJH9BH5.png" alt="IHN TOPUP Logo" width={48} height={48} />
                                </Link>
                           </div>
                        </div>
                        <p className="text-white/80 text-sm">
                            Get your favorite game credits and digital vouchers instantly. Fast, secure, and reliable service.
                        </p>
                    </div>
                    
                    <div>
                        <h3 className="font-bold text-lg mb-4">Customer Support</h3>
                        <div className="space-y-3">
                            <Link href="https://t.me/ihntopup_help" target="_blank" rel="noopener noreferrer" className="block p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                                <div className="flex items-center gap-3">
                                    <TelegramIcon className="h-7 w-7 text-white" />
                                    <div>
                                        <p className="text-xs"> </p>
                                        <p className="font-semibold">Telegram Support</p>
                                    </div>
                                </div>
                            </Link>
                            <Link href="https://t.me/ihntopup" target="_blank" rel="noopener noreferrer" className="block p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                                <div className="flex items-center gap-3">
                                     <TelegramIcon className="h-7 w-7 text-white" />
                                    <div>
                                        <p className="text-xs">Telegram Group</p>
                                        <p className="font-semibold">Join Now</p>
                                    </div>
                                </div>
                            </Link>
                        </div>
                    </div>

                     <div>
                        <h3 className="font-bold text-lg mb-4">Quick Links</h3>
                        <ul className="space-y-2">
                            <li><Link href="/about" className="text-white/80 hover:text-white">About Us</Link></li>
                            <li><Link href="/topup" className="text-white/80 hover:text-white">Top-Up</Link></li>
                            <li><Link href="/orders" className="text-white/80 hover:text-white">My Orders</Link></li>
                            <li><Link href="/profile" className="text-white/80 hover:text-white">Profile</Link></li>
                            <li><Link href="/support" className="text-white/80 hover:text-white">Support</Link></li>
                            <li><Link href="/privacy" className="text-white/80 hover:text-white">Privacy Policy</Link></li>
                            <li><Link href="/terms" className="text-white/80 hover:text-white">Terms & Conditions</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="mt-8 pt-8 border-t border-white/10 text-center text-white/60">
                    <p className="font-semibold mb-4">© 2025 IHN TOPUP. All Rights Reserved.</p>
                    <div className="w-24 h-px bg-white/20 mx-auto mb-4"></div>
                    <div className="text-xs">
                        <p>IHN TOPUP is your one-stop shop for all digital top-up needs in Bangladesh.</p>
                        <p>We provide a fast, secure, and user-friendly platform for gamers and digital service users.</p>
                        <p>Our mission is to provide the best service and ensure customer satisfaction.</p>
                    </div>
                </div>
            </div>
        </footer>
    );
}
