import Image from "next/image"
export default function Header (){
    return(
        <div className="navbar bg-white border-b border-gray-300">
            <div className="flex-1">
                <button className="btn btn-ghost">
                    <Image 
                        src="/NetworkU.png"
                        alt="logo"
                        width="100"
                        height="100"
                    />
                </button>
            </div>
        </div>
    );
}