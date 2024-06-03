import { Dispatch, SetStateAction, createContext, useContext, useState } from "react";

type StoreClosedType = {
    userContinueAnyways: boolean,
    setUserContinueAnyways: Dispatch<SetStateAction<boolean>>;
}

type Props = {
    children: React.ReactNode
}

const Context = createContext<StoreClosedType | null>(null)


export const StoreClosedProvider = ({ children }: Props) => {
    const [userContinueAnyways, setUserContinueAnyways] = useState(false);
    return (
        // <Context.Provider value={{ userContinueAnyways, setUserContinueAnyways }}>
        //     {children}
        //     <Context.Provider />

        <Context.Provider value={{ userContinueAnyways, setUserContinueAnyways }}>
            {children}
        </Context.Provider>
    )
}

export const useStoreClosed = () => {
    const context = useContext(Context);
    if (!context) {
        throw new Error('useStoreClosed must be used within a StoreClosedProvider');
    }
    return context;
}