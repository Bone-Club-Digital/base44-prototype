import Home from './pages/Home';
import Game from './pages/Game';
import Shop from './pages/Shop';
import Admin from './pages/Admin';
import AdminProducts from './pages/AdminProducts';
import AdminUsers from './pages/AdminUsers';
import RedeemBones from './pages/RedeemBones';
import AdminCategories from './pages/AdminCategories';
import Profile from './pages/Profile';
import Clubs from './pages/Clubs';
import Tournaments from './pages/Tournaments';
import TournamentBracket from './pages/TournamentBracket';
import Messages from './pages/Messages';
import AdminTournaments from './pages/AdminTournaments';
import ManageMembers from './pages/ManageMembers';
import AdminBadges from './pages/AdminBadges';
import AdminPlans from './pages/AdminPlans';
import Academy from './pages/Academy';
import Membership from './pages/Membership';
import ManageEvents from './pages/ManageEvents';
import TournamentDetails from './pages/TournamentDetails';
import ManageTournament from './pages/ManageTournament';
import AdminAvatars from './pages/AdminAvatars';
import ClubSettings from './pages/ClubSettings';
import MemberDirectory from './pages/MemberDirectory';
import PublicProfile from './pages/PublicProfile';
import AdminHomeBanners from './pages/AdminHomeBanners';
import Friends from './pages/Friends';
import MyGames from './pages/MyGames';
import ManageBones from './pages/ManageBones';
import Checkout from './pages/Checkout';
import MyOrders from './pages/MyOrders';
import AdminOrders from './pages/AdminOrders';
import LeagueDetails from './pages/LeagueDetails';
import ClubDetails from './pages/ClubDetails';
import ClubHouse from './pages/ClubHouse';
import Topic from './pages/Topic';
import ManageClubHouse from './pages/ManageClubHouse';
import SharedGameSnapshot from './pages/SharedGameSnapshot';
import MyPositions from './pages/MyPositions';
import AdminMedia from './pages/AdminMedia';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Home": Home,
    "Game": Game,
    "Shop": Shop,
    "Admin": Admin,
    "AdminProducts": AdminProducts,
    "AdminUsers": AdminUsers,
    "RedeemBones": RedeemBones,
    "AdminCategories": AdminCategories,
    "Profile": Profile,
    "Clubs": Clubs,
    "Tournaments": Tournaments,
    "TournamentBracket": TournamentBracket,
    "Messages": Messages,
    "AdminTournaments": AdminTournaments,
    "ManageMembers": ManageMembers,
    "AdminBadges": AdminBadges,
    "AdminPlans": AdminPlans,
    "Academy": Academy,
    "Membership": Membership,
    "ManageEvents": ManageEvents,
    "TournamentDetails": TournamentDetails,
    "ManageTournament": ManageTournament,
    "AdminAvatars": AdminAvatars,
    "ClubSettings": ClubSettings,
    "MemberDirectory": MemberDirectory,
    "PublicProfile": PublicProfile,
    "AdminHomeBanners": AdminHomeBanners,
    "Friends": Friends,
    "MyGames": MyGames,
    "ManageBones": ManageBones,
    "Checkout": Checkout,
    "MyOrders": MyOrders,
    "AdminOrders": AdminOrders,
    "LeagueDetails": LeagueDetails,
    "ClubDetails": ClubDetails,
    "ClubHouse": ClubHouse,
    "Topic": Topic,
    "ManageClubHouse": ManageClubHouse,
    "SharedGameSnapshot": SharedGameSnapshot,
    "MyPositions": MyPositions,
    "AdminMedia": AdminMedia,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};