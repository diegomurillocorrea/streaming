"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";

import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from "@/components/ui/alert-dialog";

import {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
} from "@/components/ui/select";

import {
    LuPlus,
    LuPencil,
    LuTrash2,
    LuRefreshCw,
} from "react-icons/lu";

import { TableScrollArea } from "@/components/admin/table-scroll-area";
import { TableSearchInput } from "@/components/admin/table-search-input";
import { rowMatchesSearch } from "@/lib/table-search";

export default function CardsAdminPage() {
    const supabase = useMemo(() => createBrowserClient(), []);

    // ---------- Data state ----------
    const [cards, setCards] = useState([]);
    const [paymentNetworks, setPaymentNetworks] = useState([]);
    const [cardTypes, setCardTypes] = useState([]);

    const [loadingCards, setLoadingCards] = useState(true);
    const [loadingRefs, setLoadingRefs] = useState(true);

    const [cardsError, setCardsError] = useState("");
    const [networksError, setNetworksError] = useState("");
    const [typesError, setTypesError] = useState("");

    // ---------- Cards: modals & form ----------
    const [createCardOpen, setCreateCardOpen] = useState(false);
    const [editCardOpen, setEditCardOpen] = useState(false);
    const [deleteCardOpen, setDeleteCardOpen] = useState(false);

    const [currentCard, setCurrentCard] = useState(null);

    const [formOwnerName, setFormOwnerName] = useState("");
    const [formCardNumber, setFormCardNumber] = useState("");
    const [formNetworkId, setFormNetworkId] = useState("");
    const [formCardTypeId, setFormCardTypeId] = useState("");
    const [formExpirationDate, setFormExpirationDate] = useState("");

    const [savingCard, setSavingCard] = useState(false);
    const [deletingCard, setDeletingCard] = useState(false);

    // ---------- Payment networks: modal & form ----------
    const [manageNetworksOpen, setManageNetworksOpen] = useState(false);
    const [newNetworkName, setNewNetworkName] = useState("");
    const [editingNetwork, setEditingNetwork] = useState(null);
    const [editingNetworkName, setEditingNetworkName] = useState("");
    const [savingNetwork, setSavingNetwork] = useState(false);
    const [networkDeleteOpen, setNetworkDeleteOpen] = useState(false);
    const [networkToDelete, setNetworkToDelete] = useState(null);
    const [deletingNetwork, setDeletingNetwork] = useState(false);

    // ---------- Card types: modal & form ----------
    const [manageTypesOpen, setManageTypesOpen] = useState(false);
    const [newTypeName, setNewTypeName] = useState("");
    const [editingType, setEditingType] = useState(null);
    const [editingTypeName, setEditingTypeName] = useState("");
    const [savingType, setSavingType] = useState(false);
    const [typeDeleteOpen, setTypeDeleteOpen] = useState(false);
    const [typeToDelete, setTypeToDelete] = useState(null);
    const [deletingType, setDeletingType] = useState(false);

    const [cardsTableSearch, setCardsTableSearch] = useState("");
    const [networksTableSearch, setNetworksTableSearch] = useState("");
    const [typesTableSearch, setTypesTableSearch] = useState("");

    // ---------- Loaders ----------
    const loadReferenceData = async () => {
        setLoadingRefs(true);
        setNetworksError("");
        setTypesError("");

        const [
            { data: networks, error: netErr },
            { data: types, error: typeErr },
        ] = await Promise.all([
            supabase
                .from("payment_networks")
                .select("*")
                .order("id_payment_network", { ascending: true }),
            supabase
                .from("card_types")
                .select("*")
                .order("id_card_type", { ascending: true }),
        ]);

        if (netErr) {
            console.error(netErr);
            setNetworksError(netErr.message || "No se pudieron cargar las redes de pago.");
        } else {
            setPaymentNetworks(networks || []);
        }

        if (typeErr) {
            console.error(typeErr);
            setTypesError(typeErr.message || "No se pudieron cargar los tipos de tarjeta.");
        } else {
            setCardTypes(types || []);
        }

        setLoadingRefs(false);
    };

    const loadCards = async () => {
        setLoadingCards(true);
        setCardsError("");

        const { data, error } = await supabase
            .from("cards")
            .select("*")
            .order("id_card", { ascending: true });

        if (error) {
            console.error(error);
            setCardsError(error.message || "No se pudieron cargar las tarjetas.");
        } else {
            setCards(data || []);
        }

        setLoadingCards(false);
    };

    useEffect(() => {
        loadReferenceData();
        loadCards();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---------- Helpers ----------
    // Formats what the user types into MM/YY
    const formatExpiryInput = (raw) => {
        const digits = raw.replace(/\D/g, "").slice(0, 4); // MMYY

        if (digits.length <= 2) {
            // still typing month
            return digits;
        }

        const mm = digits.slice(0, 2);
        const yy = digits.slice(2, 4);
        return `${mm}/${yy}`;
    };

    // Converts "MM/YY" → "YYYY-MM-01" (for Postgres DATE)
    const expiryInputToDbDate = (value) => {
        const match = value.match(/^(\d{2})\/(\d{2})$/);
        if (!match) return null;

        const mmNum = Number(match[1]);
        const yyNum = Number(match[2]);

        if (!Number.isFinite(mmNum) || mmNum < 1 || mmNum > 12) {
            return null;
        }

        const year = 2000 + yyNum; // 24 -> 2024
        const mm = String(mmNum).padStart(2, "0");

        return `${year}-${mm}-01`; // 2024-05-01
    };

    // Converts "YYYY-MM-DD" (or "YYYY-MM-01T...") → "MM/YY"
    const expiryDbToInput = (value) => {
        if (!value) return "";

        const iso = String(value).split("T")[0]; // "2024-05-01"
        const [year, month] = iso.split("-");
        if (!year || !month) return "";

        const yy = String(Number(year) % 100).padStart(2, "0");
        const mm = month.padStart(2, "0");

        return `${mm}/${yy}`;
    };

    const formatCardNumberForInput = (value) => {
        // keep only digits and limit to 16 (ajusta si quieres más)
        const digits = value.replace(/\D/g, "").slice(0, 16);
        // group in 4s: 1234 1234 1234 1234
        return digits.replace(/(.{4})/g, "$1 ").trim();
    };


    const getNetworkName = (id) =>
        paymentNetworks.find((n) => n.id_payment_network === id)?.name || "-";

    const getCardTypeName = (id) =>
        cardTypes.find((t) => t.id_card_type === id)?.name || "-";

    const filteredCards = useMemo(() => {
        if (!cardsTableSearch.trim()) return cards;
        return cards.filter((row) =>
            rowMatchesSearch(
                [
                    row.id_card,
                    row.owner_name,
                    row.card_number,
                    row.expirationDate,
                    row.created_at,
                    row.id_payment_network,
                    row.id_card_type,
                ],
                cardsTableSearch
            )
        );
    }, [cards, cardsTableSearch]);

    const filteredPaymentNetworks = useMemo(() => {
        if (!networksTableSearch.trim()) return paymentNetworks;
        return paymentNetworks.filter((row) =>
            rowMatchesSearch(
                [row.id_payment_network, row.name, row.created_at],
                networksTableSearch
            )
        );
    }, [paymentNetworks, networksTableSearch]);

    const filteredCardTypes = useMemo(() => {
        if (!typesTableSearch.trim()) return cardTypes;
        return cardTypes.filter((row) =>
            rowMatchesSearch(
                [row.id_card_type, row.name, row.created_at],
                typesTableSearch
            )
        );
    }, [cardTypes, typesTableSearch]);

    const formatCardNumber = (value) => {
        if (!value) return "-";
        const last4 = value.slice(-4);
        return `•••• •••• •••• ${last4}`;
    };

    const referencesReady =
        paymentNetworks.length > 0 && cardTypes.length > 0 && !loadingRefs;

    // ---------- Cards: create / edit / delete ----------
    const resetCardForm = () => {
        setFormOwnerName("");
        setFormCardNumber("");
        setFormNetworkId("");
        setFormCardTypeId("");
        setFormExpirationDate("");
        setCardsError("");
    };

    const openCreateCardModal = () => {
        setCurrentCard(null);
        resetCardForm();
        setCreateCardOpen(true);
    };

    const openEditCardModal = (row) => {
        setCurrentCard(row);
        setFormOwnerName(row.owner_name || "");
        setFormCardNumber(formatCardNumberForInput(row.card_number || ""));
        setFormNetworkId(
            row.id_payment_network != null ? String(row.id_payment_network) : ""
        );
        setFormCardTypeId(
            row.id_card_type != null ? String(row.id_card_type) : ""
        );
        setFormExpirationDate(expiryDbToInput(row.expirationDate));
        setCardsError("");
        setEditCardOpen(true);
    };

    const handleCreateCard = async () => {
        if (
            !formOwnerName.trim() ||
            !formCardNumber.trim() ||
            !formNetworkId ||
            !formCardTypeId ||
            !formExpirationDate
        ) {
            setCardsError("Todos los campos de la tarjeta son obligatorios.");
            return;
        }

        setCardsError("");

        const expiryDateForDb = expiryInputToDbDate(formExpirationDate);
        if (!expiryDateForDb) {
            setCardsError("La fecha de vencimiento debe tener el formato MM/YY.");
            return;
        }

        setSavingCard(true);

        const payload = {
            owner_name: formOwnerName.trim(),
            card_number: formCardNumber.replace(/\s+/g, "").trim(),
            id_payment_network: Number(formNetworkId),
            id_card_type: Number(formCardTypeId),
            expirationDate: expiryDateForDb,
        };

        const { data, error } = await supabase
            .from("cards")
            .insert(payload)
            .select()
            .single();

        setSavingCard(false);

        if (error) {
            console.error(error);
            setCardsError(error.message || "No se pudo crear la tarjeta.");
            return;
        }

        setCards((prev) => [data, ...prev]);
        setCreateCardOpen(false);
    };

    const handleUpdateCard = async () => {
        if (!currentCard) return;

        if (
            !formOwnerName.trim() ||
            !formCardNumber.trim() ||
            !formNetworkId ||
            !formCardTypeId ||
            !formExpirationDate
        ) {
            setCardsError("Todos los campos de la tarjeta son obligatorios.");
            return;
        }

        setCardsError("");

        const expiryDateForDb = expiryInputToDbDate(formExpirationDate);
        if (!expiryDateForDb) {
            setCardsError("La fecha de vencimiento debe tener el formato MM/YY.");
            return;
        }

        setSavingCard(true);

        const payload = {
            owner_name: formOwnerName.trim(),
            card_number: formCardNumber.replace(/\s+/g, "").trim(),
            id_payment_network: Number(formNetworkId),
            id_card_type: Number(formCardTypeId),
            expirationDate: expiryDateForDb,
        };

        const { data, error } = await supabase
            .from("cards")
            .update(payload)
            .eq("id_card", currentCard.id_card)
            .select()
            .single();

        setSavingCard(false);

        if (error) {
            console.error(error);
            setCardsError(error.message || "No se pudo actualizar la tarjeta.");
            return;
        }

        setCards((prev) =>
            prev.map((item) => (item.id_card === data.id_card ? data : item))
        );
        setEditCardOpen(false);
    };

    const openDeleteCardModal = (row) => {
        setCurrentCard(row);
        setDeleteCardOpen(true);
    };

    const handleDeleteCard = async () => {
        if (!currentCard) return;

        setDeletingCard(true);
        setCardsError("");

        const { error } = await supabase
            .from("cards")
            .delete()
            .eq("id_card", currentCard.id_card);

        setDeletingCard(false);

        if (error) {
            console.error(error);
            setCardsError(error.message || "No se pudo eliminar la tarjeta.");
            return;
        }

        setCards((prev) =>
            prev.filter((item) => item.id_card !== currentCard.id_card)
        );
        setDeleteCardOpen(false);
    };

    // ---------- Payment networks: CRUD ----------
    const openManageNetworks = () => {
        setManageNetworksOpen(true);
        setNewNetworkName("");
        setEditingNetwork(null);
        setEditingNetworkName("");
        setNetworksError("");
    };

    const handleCreateNetwork = async () => {
        if (!newNetworkName.trim()) {
            setNetworksError("El nombre de la red de pago es obligatorio.");
            return;
        }

        setSavingNetwork(true);
        setNetworksError("");

        const { data, error } = await supabase
            .from("payment_networks")
            .insert({ name: newNetworkName.trim() })
            .select()
            .single();

        setSavingNetwork(false);

        if (error) {
            console.error(error);
            setNetworksError(error.message || "No se pudo crear la red de pago.");
            return;
        }

        setPaymentNetworks((prev) => [...prev, data]);
        setNewNetworkName("");
    };

    const startEditNetwork = (network) => {
        setEditingNetwork(network);
        setEditingNetworkName(network.name || "");
    };

    const cancelEditNetwork = () => {
        setEditingNetwork(null);
        setEditingNetworkName("");
    };

    const handleUpdateNetwork = async () => {
        if (!editingNetwork) return;
        if (!editingNetworkName.trim()) {
            setNetworksError("El nombre de la red de pago es obligatorio.");
            return;
        }

        setSavingNetwork(true);
        setNetworksError("");

        const { data, error } = await supabase
            .from("payment_networks")
            .update({ name: editingNetworkName.trim() })
            .eq("id_payment_network", editingNetwork.id_payment_network)
            .select()
            .single();

        setSavingNetwork(false);

        if (error) {
            console.error(error);
            setNetworksError(error.message || "No se pudo actualizar la red de pago.");
            return;
        }

        setPaymentNetworks((prev) =>
            prev.map((item) =>
                item.id_payment_network === data.id_payment_network ? data : item
            )
        );
        setEditingNetwork(null);
        setEditingNetworkName("");
    };

    const openNetworkDelete = (network) => {
        setNetworkToDelete(network);
        setNetworkDeleteOpen(true);
    };

    const handleDeleteNetwork = async () => {
        if (!networkToDelete) return;

        setDeletingNetwork(true);
        setNetworksError("");

        const { error } = await supabase
            .from("payment_networks")
            .delete()
            .eq("id_payment_network", networkToDelete.id_payment_network);

        setDeletingNetwork(false);

        if (error) {
            console.error(error);
            setNetworksError(error.message || "No se pudo eliminar la red de pago.");
            return;
        }

        setPaymentNetworks((prev) =>
            prev.filter(
                (item) =>
                    item.id_payment_network !== networkToDelete.id_payment_network
            )
        );
        setNetworkDeleteOpen(false);
    };

    // ---------- Card types: CRUD ----------
    const openManageTypes = () => {
        setManageTypesOpen(true);
        setNewTypeName("");
        setEditingType(null);
        setEditingTypeName("");
        setTypesError("");
    };

    const handleCreateType = async () => {
        if (!newTypeName.trim()) {
            setTypesError("El nombre del tipo de tarjeta es obligatorio.");
            return;
        }

        setSavingType(true);
        setTypesError("");

        const { data, error } = await supabase
            .from("card_types")
            .insert({ name: newTypeName.trim() })
            .select()
            .single();

        setSavingType(false);

        if (error) {
            console.error(error);
            setTypesError(error.message || "No se pudo crear el tipo de tarjeta.");
            return;
        }

        setCardTypes((prev) => [...prev, data]);
        setNewTypeName("");
    };

    const startEditType = (type) => {
        setEditingType(type);
        setEditingTypeName(type.name || "");
    };

    const cancelEditType = () => {
        setEditingType(null);
        setEditingTypeName("");
    };

    const handleUpdateType = async () => {
        if (!editingType) return;
        if (!editingTypeName.trim()) {
            setTypesError("El nombre del tipo de tarjeta es obligatorio.");
            return;
        }

        setSavingType(true);
        setTypesError("");

        const { data, error } = await supabase
            .from("card_types")
            .update({ name: editingTypeName.trim() })
            .eq("id_card_type", editingType.id_card_type)
            .select()
            .single();

        setSavingType(false);

        if (error) {
            console.error(error);
            setTypesError(error.message || "No se pudo actualizar el tipo de tarjeta.");
            return;
        }

        setCardTypes((prev) =>
            prev.map((item) =>
                item.id_card_type === data.id_card_type ? data : item
            )
        );
        setEditingType(null);
        setEditingTypeName("");
    };

    const openTypeDelete = (type) => {
        setTypeToDelete(type);
        setTypeDeleteOpen(true);
    };

    const handleDeleteType = async () => {
        if (!typeToDelete) return;

        setDeletingType(true);
        setTypesError("");

        const { error } = await supabase
            .from("card_types")
            .delete()
            .eq("id_card_type", typeToDelete.id_card_type);

        setDeletingType(false);

        if (error) {
            console.error(error);
            setTypesError(error.message || "No se pudo eliminar el tipo de tarjeta.");
            return;
        }

        setCardTypes((prev) =>
            prev.filter((item) => item.id_card_type !== typeToDelete.id_card_type)
        );
        setTypeDeleteOpen(false);
    };

    // ---------- Render ----------
    return (
        <main className="mx-auto space-y-4">
            <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Tarjetas</h1>
                    <p className="text-sm text-zinc-600 dark:text-emerald-300">
                        Administra tarjetas y los catálogos de redes de pago y tipos de
                        tarjeta.
                    </p>
                </div>

                <div className="flex flex-col gap-2 items-stretch md:items-end">
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            className="cursor-pointer border-zinc-300 hover:bg-zinc-50 dark:border-emerald-400/60"
                            onClick={loadCards}
                            disabled={loadingCards}
                        >
                            <LuRefreshCw
                                className={`h-4 w-4 ${loadingCards ? "animate-spin" : ""
                                    }`}
                            />
                        </Button>

                        <Button
                            className="cursor-pointer bg-emerald-600 text-white hover:bg-emerald-700"
                            onClick={openCreateCardModal}
                            disabled={!referencesReady}
                        >
                            <LuPlus className="mr-2 h-4 w-4" />
                            Nueva tarjeta
                        </Button>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            className="cursor-pointer border-zinc-300 hover:bg-zinc-50 dark:border-emerald-400/60 text-xs"
                            onClick={openManageNetworks}
                        >
                            Gestionar redes de pago
                        </Button>
                        <Button
                            variant="outline"
                            className="cursor-pointer border-zinc-300 hover:bg-zinc-50 dark:border-emerald-400/60 text-xs"
                            onClick={openManageTypes}
                        >
                            Gestionar tipos de tarjeta
                        </Button>
                    </div>
                </div>
            </header>

            {cardsError && (
                <p className="text-sm text-red-600 dark:text-red-400">{cardsError}</p>
            )}

            <Card className="border border-zinc-200 bg-white shadow-sm dark:border-emerald-800 dark:bg-emerald-900/60">
                <CardHeader>
                    <CardTitle className="text-base">Lista de tarjetas</CardTitle>
                    <CardDescription>
                        Todas las tarjetas guardadas en la tabla <code>cards</code>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    <TableSearchInput
                        id="cards-main-table-search"
                        value={cardsTableSearch}
                        onChange={setCardsTableSearch}
                        placeholder="Buscar por titular, número, red o tipo…"
                        aria-label="Buscar en la lista de tarjetas"
                    />
                    <TableScrollArea>
                        <table className="w-full min-w-max border-collapse text-sm">
                            <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-white dark:border-emerald-800 dark:bg-emerald-900">
                                <tr className="text-left text-xs font-semibold uppercase text-zinc-500 dark:text-emerald-300">
                                    <th className="py-3.5 px-4">ID</th>
                                    <th className="py-3.5 px-4">Titular</th>
                                    <th className="py-3.5 px-4">Número de tarjeta</th>
                                    <th className="py-3.5 px-4">Red</th>
                                    <th className="py-3.5 px-4">Tipo</th>
                                    <th className="py-3.5 px-4">Vencimiento</th>
                                    <th className="py-3.5 px-4">Creado el</th>
                                    <th className="py-3.5 px-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingCards ? (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="py-8 px-4 text-center text-sm text-zinc-500 dark:text-emerald-300"
                                        >
                                            Cargando tarjetas...
                                        </td>
                                    </tr>
                                ) : cards.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="py-8 px-4 text-center text-sm text-zinc-500 dark:text-emerald-300"
                                        >
                                            No se encontraron tarjetas. Haz clic en &quot;Nueva
                                            tarjeta&quot; para agregar una.
                                        </td>
                                    </tr>
                                ) : filteredCards.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan={8}
                                            className="py-8 px-4 text-center text-sm text-zinc-500 dark:text-emerald-300"
                                        >
                                            No hay resultados para &quot;{cardsTableSearch.trim()}&quot;.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCards.map((row) => (
                                        <tr
                                            key={row.id_card}
                                            className="border-b border-zinc-100 last:border-b-0 dark:border-emerald-900/60"
                                        >
                                            <td className="py-3.5 px-4 align-middle text-zinc-700 dark:text-emerald-100">
                                                {row.id_card}
                                            </td>
                                            <td className="py-3.5 px-4 align-middle text-zinc-900 dark:text-emerald-50">
                                                {row.owner_name}
                                            </td>
                                            <td className="py-3.5 px-4 align-middle text-zinc-900 dark:text-emerald-50">
                                                {formatCardNumber(row.card_number)}
                                            </td>
                                            <td className="py-3.5 px-4 align-middle text-zinc-600 dark:text-emerald-200">
                                                {getNetworkName(row.id_payment_network)}
                                            </td>
                                            <td className="py-3.5 px-4 align-middle text-zinc-600 dark:text-emerald-200">
                                                {getCardTypeName(row.id_card_type)}
                                            </td>
                                            <td className="py-3.5 px-4 align-middle text-zinc-600 dark:text-emerald-200">
                                                {row.expirationDate ? expiryDbToInput(row.expirationDate) : "-"}
                                            </td>
                                            <td className="py-3.5 px-4 align-middle text-zinc-600 dark:text-emerald-200">
                                                {row.created_at
                                                    ? new Date(row.created_at).toLocaleString()
                                                    : "-"}
                                            </td>
                                            <td className="py-3.5 px-4 align-middle">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        className="cursor-pointer border-zinc-300 hover:bg-zinc-50 dark:border-emerald-400/60"
                                                        onClick={() => openEditCardModal(row)}
                                                    >
                                                        <LuPencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        className="cursor-pointer border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/60 dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white"
                                                        onClick={() => openDeleteCardModal(row)}
                                                    >
                                                        <LuTrash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </TableScrollArea>
                </CardContent>
            </Card>

            {/* ---------- Card create modal ---------- */}
            <Dialog open={createCardOpen} onOpenChange={setCreateCardOpen}>
                <DialogContent className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-white">
                    <DialogHeader>
                        <DialogTitle>Nueva tarjeta</DialogTitle>
                        <DialogDescription>
                            Agrega una nueva tarjeta al sistema.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <Label htmlFor="card-owner">Nombre del titular</Label>
                            <Input
                                id="card-owner"
                                type="text"
                                placeholder="Titular de la tarjeta"
                                value={formOwnerName}
                                onChange={(e) => setFormOwnerName(e.target.value)}
                                disabled={savingCard}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="card-number">Número de tarjeta</Label>
                            <Input
                                id="card-number"
                                type="text"
                                placeholder="XXXX XXXX XXXX XXXX"
                                value={formCardNumber}
                                onChange={(e) =>
                                    setFormCardNumber(formatCardNumberForInput(e.target.value))
                                }
                                disabled={savingCard}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>Red de pago</Label>
                            <Select
                                value={formNetworkId}
                                onValueChange={setFormNetworkId}
                                disabled={savingCard || loadingRefs}
                            >
                                <SelectTrigger className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-900 dark:border-emerald-700 dark:text-white">
                                    <SelectValue placeholder="Seleccionar red de pago" />
                                </SelectTrigger>
                                <SelectContent className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-950 dark:border-emerald-700 dark:text-white">
                                    {paymentNetworks.map((network) => (
                                        <SelectItem
                                            key={network.id_payment_network}
                                            value={String(network.id_payment_network)}
                                        >
                                            {network.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label>Tipo de tarjeta</Label>
                            <Select
                                value={formCardTypeId}
                                onValueChange={setFormCardTypeId}
                                disabled={savingCard || loadingRefs}
                            >
                                <SelectTrigger className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-900 dark:border-emerald-700 dark:text-white">
                                    <SelectValue placeholder="Seleccionar tipo de tarjeta" />
                                </SelectTrigger>
                                <SelectContent className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-950 dark:border-emerald-700 dark:text-white">
                                    {cardTypes.map((type) => (
                                        <SelectItem
                                            key={type.id_card_type}
                                            value={String(type.id_card_type)}
                                        >
                                            {type.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="card-expiration">Fecha de vencimiento</Label>
                            <Input
                                id="card-expiration"
                                type="text"
                                placeholder="MM/YY"
                                value={formExpirationDate}
                                onChange={(e) =>
                                    setFormExpirationDate(formatExpiryInput(e.target.value))
                                }
                                disabled={savingCard}
                            />
                        </div>

                        {cardsError && (
                            <p className="text-sm text-red-600 dark:text-red-400">{cardsError}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setCreateCardOpen(false)}
                            disabled={savingCard}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCreateCard}
                            disabled={savingCard}
                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                            {savingCard ? "Guardando..." : "Crear"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ---------- Card edit modal ---------- */}
            <Dialog open={editCardOpen} onOpenChange={setEditCardOpen}>
                <DialogContent className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-white">
                    <DialogHeader>
                        <DialogTitle>Editar tarjeta</DialogTitle>
                        <DialogDescription>
                            Actualiza la tarjeta seleccionada.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <div className="space-y-1">
                            <Label htmlFor="edit-card-owner">Nombre del titular</Label>
                            <Input
                                id="edit-card-owner"
                                type="text"
                                value={formOwnerName}
                                onChange={(e) => setFormOwnerName(e.target.value)}
                                disabled={savingCard}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="edit-card-number">Número de tarjeta</Label>
                            <Input
                                id="edit-card-number"
                                type="text"
                                value={formCardNumber}
                                onChange={(e) =>
                                    setFormCardNumber(formatCardNumberForInput(e.target.value))
                                }
                                disabled={savingCard}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label>Editar red de pago</Label>
                            <Select
                                value={formNetworkId}
                                onValueChange={setFormNetworkId}
                                disabled={savingCard || loadingRefs}
                            >
                                <SelectTrigger className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-900 dark:border-emerald-700 dark:text-white">
                                    <SelectValue placeholder="Seleccionar red de pago" />
                                </SelectTrigger>
                                <SelectContent className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-950 dark:border-emerald-700 dark:text-white">
                                    {paymentNetworks.map((network) => (
                                        <SelectItem
                                            key={network.id_payment_network}
                                            value={String(network.id_payment_network)}
                                        >
                                            {network.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label>Editar tipo de tarjeta</Label>
                            <Select
                                value={formCardTypeId}
                                onValueChange={setFormCardTypeId}
                                disabled={savingCard || loadingRefs}
                            >
                                <SelectTrigger className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-900 dark:border-emerald-700 dark:text-white">
                                    <SelectValue placeholder="Seleccionar tipo de tarjeta" />
                                </SelectTrigger>
                                <SelectContent className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-950 dark:border-emerald-700 dark:text-white">
                                    {cardTypes.map((type) => (
                                        <SelectItem
                                            key={type.id_card_type}
                                            value={String(type.id_card_type)}
                                        >
                                            {type.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="edit-card-expiration">Fecha de vencimiento</Label>
                            <Input
                                id="edit-card-expiration"
                                type="text"
                                placeholder="MM/YY"
                                value={formExpirationDate}
                                onChange={(e) =>
                                    setFormExpirationDate(formatExpiryInput(e.target.value))
                                }
                                disabled={savingCard}
                            />
                        </div>

                        {cardsError && (
                            <p className="text-sm text-red-600 dark:text-red-400">{cardsError}</p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setEditCardOpen(false)}
                            disabled={savingCard}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleUpdateCard}
                            disabled={savingCard}
                            className="bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                            {savingCard ? "Guardando..." : "Guardar cambios"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ---------- Card delete modal ---------- */}
            <AlertDialog open={deleteCardOpen} onOpenChange={setDeleteCardOpen}>
                <AlertDialogContent className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar tarjeta</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Seguro que deseas eliminar esta tarjeta de{" "}
                            <span className="font-mono text-zinc-700 dark:text-emerald-200">
                                {currentCard?.owner_name}
                            </span>
                            ? Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deletingCard}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteCard}
                            disabled={deletingCard}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deletingCard ? "Eliminando..." : "Eliminar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ---------- Manage payment networks modal ---------- */}
            <Dialog open={manageNetworksOpen} onOpenChange={setManageNetworksOpen}>
                <DialogContent className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-white max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Redes de pago</DialogTitle>
                        <DialogDescription>
                            Crea, edita y elimina redes de pago como Visa, Mastercard,
                            etc.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {networksError && (
                            <p className="text-sm text-red-600 dark:text-red-400">{networksError}</p>
                        )}

                        <div className="space-y-1">
                            <Label htmlFor="new-network">Nueva red de pago</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="new-network"
                                    type="text"
                                    placeholder="Ej. Visa"
                                    value={newNetworkName}
                                    onChange={(e) => setNewNetworkName(e.target.value)}
                                    disabled={savingNetwork}
                                />
                                <Button
                                    onClick={handleCreateNetwork}
                                    disabled={savingNetwork}
                                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                    {savingNetwork ? "Guardando..." : "Agregar"}
                                </Button>
                            </div>
                        </div>

                        <TableSearchInput
                            id="networks-modal-table-search"
                            value={networksTableSearch}
                            onChange={setNetworksTableSearch}
                            placeholder="Buscar red de pago…"
                            aria-label="Buscar en redes de pago"
                        />
                        <TableScrollArea>
                            <table className="w-full min-w-max border-collapse text-sm">
                                <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-white dark:border-emerald-800 dark:bg-emerald-900">
                                    <tr className="text-left text-xs font-semibold uppercase text-zinc-500 dark:text-emerald-300">
                                        <th className="py-3.5 px-4">ID</th>
                                        <th className="py-3.5 px-4">Nombre</th>
                                        <th className="py-3.5 px-4">Creado el</th>
                                        <th className="py-3.5 px-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPaymentNetworks.map((row) => {
                                        const isEditing =
                                            editingNetwork &&
                                            editingNetwork.id_payment_network ===
                                            row.id_payment_network;

                                        return (
                                            <tr
                                                key={row.id_payment_network}
                                                className="border-b border-zinc-100 last:border-b-0 dark:border-emerald-900/60"
                                            >
                                                <td className="py-3.5 px-4 align-middle text-zinc-700 dark:text-emerald-100">
                                                    {row.id_payment_network}
                                                </td>
                                                <td className="py-3.5 px-4 align-middle text-zinc-900 dark:text-emerald-50">
                                                    {isEditing ? (
                                                        <Input
                                                            value={editingNetworkName}
                                                            onChange={(e) =>
                                                                setEditingNetworkName(e.target.value)
                                                            }
                                                            disabled={savingNetwork}
                                                        />
                                                    ) : (
                                                        row.name
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 align-middle text-zinc-600 dark:text-emerald-200">
                                                    {row.created_at
                                                        ? new Date(row.created_at).toLocaleString()
                                                        : "-"}
                                                </td>
                                                <td className="py-3.5 px-4 align-middle">
                                                    <div className="flex justify-end gap-2">
                                                        {isEditing ? (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="cursor-pointer border-zinc-300 hover:bg-zinc-50 dark:border-emerald-400/60"
                                                                    onClick={handleUpdateNetwork}
                                                                    disabled={savingNetwork}
                                                                >
                                                                    Guardar
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={cancelEditNetwork}
                                                                    disabled={savingNetwork}
                                                                >
                                                                    Cancelar
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    className="cursor-pointer border-zinc-300 hover:bg-zinc-50 dark:border-emerald-400/60"
                                                                    onClick={() => startEditNetwork(row)}
                                                                >
                                                                    <LuPencil className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    className="cursor-pointer border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/60 dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white"
                                                                    onClick={() => openNetworkDelete(row)}
                                                                >
                                                                    <LuTrash2 className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </TableScrollArea>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={networkDeleteOpen}
                onOpenChange={setNetworkDeleteOpen}
            >
                <AlertDialogContent className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar red de pago</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Seguro que deseas eliminar{" "}
                            <span className="font-mono text-zinc-700 dark:text-emerald-200">
                                {networkToDelete?.name}
                            </span>
                            ? Esta acción no se puede deshacer y puede fallar si hay
                            tarjetas usando esta red.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deletingNetwork}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteNetwork}
                            disabled={deletingNetwork}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deletingNetwork ? "Eliminando..." : "Eliminar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ---------- Manage card types modal ---------- */}
            <Dialog open={manageTypesOpen} onOpenChange={setManageTypesOpen}>
                <DialogContent className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-white max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Tipos de tarjeta</DialogTitle>
                        <DialogDescription>
                            Crea, edita y elimina tipos de tarjeta como crédito, débito, etc.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {typesError && (
                            <p className="text-sm text-red-600 dark:text-red-400">{typesError}</p>
                        )}

                        <div className="space-y-1">
                            <Label htmlFor="new-type">Nuevo tipo de tarjeta</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="new-type"
                                    type="text"
                                    placeholder="Ej. Crédito"
                                    value={newTypeName}
                                    onChange={(e) => setNewTypeName(e.target.value)}
                                    disabled={savingType}
                                />
                                <Button
                                    onClick={handleCreateType}
                                    disabled={savingType}
                                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                    {savingType ? "Guardando..." : "Agregar"}
                                </Button>
                            </div>
                        </div>

                        <TableSearchInput
                            id="types-modal-table-search"
                            value={typesTableSearch}
                            onChange={setTypesTableSearch}
                            placeholder="Buscar tipo de tarjeta…"
                            aria-label="Buscar en tipos de tarjeta"
                        />
                        <TableScrollArea>
                            <table className="w-full min-w-max border-collapse text-sm">
                                <thead className="sticky top-0 z-10 border-b border-zinc-200 bg-white dark:border-emerald-800 dark:bg-emerald-900">
                                    <tr className="text-left text-xs font-semibold uppercase text-zinc-500 dark:text-emerald-300">
                                        <th className="py-3.5 px-4">ID</th>
                                        <th className="py-3.5 px-4">Nombre</th>
                                        <th className="py-3.5 px-4">Creado el</th>
                                        <th className="py-3.5 px-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCardTypes.map((row) => {
                                        const isEditing =
                                            editingType &&
                                            editingType.id_card_type === row.id_card_type;

                                        return (
                                            <tr
                                                key={row.id_card_type}
                                                className="border-b border-zinc-100 last:border-b-0 dark:border-emerald-900/60"
                                            >
                                                <td className="py-3.5 px-4 align-middle text-zinc-700 dark:text-emerald-100">
                                                    {row.id_card_type}
                                                </td>
                                                <td className="py-3.5 px-4 align-middle text-zinc-900 dark:text-emerald-50">
                                                    {isEditing ? (
                                                        <Input
                                                            value={editingTypeName}
                                                            onChange={(e) =>
                                                                setEditingTypeName(e.target.value)
                                                            }
                                                            disabled={savingType}
                                                        />
                                                    ) : (
                                                        row.name
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 align-middle text-zinc-600 dark:text-emerald-200">
                                                    {row.created_at
                                                        ? new Date(row.created_at).toLocaleString()
                                                        : "-"}
                                                </td>
                                                <td className="py-3.5 px-4 align-middle">
                                                    <div className="flex justify-end gap-2">
                                                        {isEditing ? (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="cursor-pointer border-zinc-300 hover:bg-zinc-50 dark:border-emerald-400/60"
                                                                    onClick={handleUpdateType}
                                                                    disabled={savingType}
                                                                >
                                                                    Guardar
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={cancelEditType}
                                                                    disabled={savingType}
                                                                >
                                                                    Cancelar
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    className="cursor-pointer border-zinc-300 hover:bg-zinc-50 dark:border-emerald-400/60"
                                                                    onClick={() => startEditType(row)}
                                                                >
                                                                    <LuPencil className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="outline"
                                                                    className="cursor-pointer border-red-200 text-red-600 hover:bg-red-50 dark:border-red-500/60 dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white"
                                                                    onClick={() => openTypeDelete(row)}
                                                                >
                                                                    <LuTrash2 className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </TableScrollArea>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={typeDeleteOpen} onOpenChange={setTypeDeleteOpen}>
                <AlertDialogContent className="border-zinc-200 bg-white text-zinc-900 dark:bg-emerald-950 dark:border-emerald-800 dark:text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Eliminar tipo de tarjeta</AlertDialogTitle>
                        <AlertDialogDescription>
                            ¿Seguro que deseas eliminar{" "}
                            <span className="font-mono text-zinc-700 dark:text-emerald-200">
                                {typeToDelete?.name}
                            </span>
                            ? Esta acción no se puede deshacer y puede fallar si hay
                            tarjetas usando este tipo.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deletingType}>
                            Cancelar
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteType}
                            disabled={deletingType}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deletingType ? "Eliminando..." : "Eliminar"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </main>
    );
}