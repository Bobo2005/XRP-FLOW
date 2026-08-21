// import { useState } from "react";
// import { useAddressBook } from "../lib/wallet/addressBook";
// import { useAccount } from "wagmi";
// import { formatUnits } from "viem";

// interface AddressBookProps {
//   className?: string;
// }

// export default function AddressBook({ className = "" }: AddressBookProps) {
//   const { address: userAddress } = useAccount();
//   const {
//     entries,
//     loading,
//     error,
//     addEntry,
//     updateEntry,
//     removeEntry,
//     getEntry,
//     getEntriesByTag,
//     resetToDefaults,
//     isValidAddress,
//   } = useAddressBook();

//   // State for modal/forms
//   const [showAddModal, setShowAddModal] = useState(false);
//   const [showEditModal, setShowEditModal] = useState(false);
//   const [editEntryId, setEditEntryId] = useState<string | null>(null);
//   const [editName, setEditName] = useState("");
//   const [editAddress, setEditAddress] = useState("");
//   const [editTags, setEditTags] = useState<string[]>([]);

//   const [newName, setNewName] = useState("");
//   const [newAddress, setNewAddress] = useState("");
//   const [newTags, setNewTags] = useState<string[]>([]);

//   // Handle adding new entry
//   const handleAddEntry = async () => {
//     if (!newName.trim() || !newAddress.trim()) {
//       alert("Name and address are required");
//       return;
//     }

//     if (!isValidAddress(newAddress)) {
//       alert("Invalid Ethereum address");
//       return;
//     }

//     try {
//       await addEntry({
//         name: newName.trim(),
//         address: newAddress.trim() as `0x${string}`,
//         tags: newTags.filter((tag) => tag.trim()).map((tag) => tag.trim()),
//       });
//       // Reset form
//       setNewName("");
//       setNewAddress("");
//       setNewTags([]);
//       setShowAddModal(false);
//     } catch (err) {
//       alert(`Failed to add address: ${err instanceof Error ? err.message : "Unknown error"}`);
//     }
//   };

//   // Handle updating entry
//   const handleUpdateEntry = async () => {
//     if (!editEntryId) return;
//     if (!editName.trim() || !editAddress.trim()) {
//       alert("Name and address are required");
//       return;
//     }

//     if (!isValidAddress(editAddress)) {
//       alert("Invalid Ethereum address");
//       return;
//     }

//     try {
//       await updateEntry(editEntryId, {
//         name: editName.trim(),
//         address: editAddress.trim() as `0x${string}`,
//         tags: editTags.filter((tag) => tag.trim()).map((tag) => tag.trim()),
//       });
//       // Reset form
//       setEditEntryId(null);
//       setEditName("");
//       setEditAddress("");
//       setEditTags([]);
//       setShowEditModal(false);
//     } catch (err) {
//       alert(`Failed to update address: ${err instanceof Error ? err.message : "Unknown error"}`);
//     }
//   };

//   // Handle removing entry
//   const handleRemoveEntry = async (id: string) => {
//     if (
//       window.confirm(
//         "Are you sure you want to remove this address from your address book?"
//       )
//     ) {
//       try {
//         await removeEntry(id);
//       } catch (err) {
//         alert(`Failed to remove address: ${err instanceof Error ? err.message : "Unknown error"}`);
//       }
//     }
//   };

//   if (loading) {
//     return (
//       <div className="text-center py-8">
//         <p className="text-text-muted">Loading address book...</p>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="text-center py-8">
//         <p className="text-danger-red">
//           Error loading address book: {
//             error instanceof Error ? error.message : "Unknown error"
//           }
//         </p>
//       </div>
//     );
//   }

//   return (
//     <div className={`${className} space-y-6`}>
//       <div className="flex items-center justify-between">
//         <h2 className="font-display text-lg font-bold">Address Book</h2>
//         <div className="flex items-center gap-3">
//           <button
//             onClick={() => setShowAddModal(true)}
//             className="px-4 py-2 bg-primary-blue/10 text-primary-blue rounded-md hover:bg-primary-blue/20 transition-colors"
//           >
//             + Add Address
//           </button>
//           <button
//             onClick={resetToDefaults}
//             className="px-4 py-2 bg-bg-surface/10 text-text-muted rounded-md hover:bg-bg-surface/20 transition-colors"
//           >
//             Reset to Defaults
//           </button>
//         </div>
//       </div>

//       {/* Add Address Modal */}
//       <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 ${
//         showAddModal ? "block" : "hidden"
//       }`}>
//         <div className="bg-bg-base rounded-xl p-6 w-full max-w-md">
//           <h3 className="mb-4 font-display text-lg font-bold">Add New Address</h3>
//           <form onSubmit={(e) => {
//             e.preventDefault();
//             handleAddEntry();
//           }} className="space-y-4">
//             <div>
//               <label className="block text-xs font-medium mb-1">Name</label>
//               <input
//                 value={newName}
//                 onChange={(e) => setNewName(e.target.value)}
//                 placeholder="Enter a label for this address"
//                 required
//                 className="block w-full rounded-md border border-border bg-bg-base px-3 py-2 text-sm ring-1 ring-inset ring-text-muted/30 placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-0"
//               />
//             </div>
//             <div>
//               <label className="block text-xs font-medium mb-1">Address</label>
//               <input
//                 value={newAddress}
//                 onChange={(e) => setNewAddress(e.target.value)}
//                 placeholder="0x..."
//                 required
//                 className="block w-full rounded-md border border-border bg-bg-base px-3 py-2 text-sm ring-1 ring-inset ring-text-muted/30 placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-0"
//               />
//               {!isValidAddress(newAddress) && newAddress && (
//                 <p className="text-xs text-danger-red mt-1">
//                   Invalid Ethereum address
//                 </p>
//               )}
//             </div>
//             <div>
//               <label className="block text-xs font-medium mb-1">Tags (optional)</label>
//               <div className="flex flex-wrap gap-2 mb-2">
//                 {newTags.map((tag, index) => (
//                   <span
//                     key={index}
//                     className="flex items-center gap-1 px-2 py-0.5 bg-bg-surface/20 rounded text-xs"
//                   >
//                     {tag}
//                     <button
//                       type="button"
//                       onClick={() => {
//                         const newTagsCopy = [...newTags];
//                         newTagsCopy.splice(index, 1);
//                         setNewTags(newTagsCopy);
//                       }}
//                       className="text-text-muted/hover hover:text-text-danger"
//                     >
//                       ×
//                     </button>
//                   </span>
//                 ))}
//                 <div className="flex items-center gap-1">
//                   <button
//                     type="button"
//                     onClick={() => {
//                       const input = document.getElementById("tag-input") as HTMLInputElement;
//                       const value = input?.value;
//                       if (value?.trim()) {
//                         setNewTags([
//                           ...newTags,
//                           value.trim().toLowerCase(),
//                         ]);
//                         input.value = "";
//                       }
//                     }}
//                     className="flex items-center gap-1 px-2 py-0.5 bg-primary-blue/10 text-primary-blue rounded hover:bg-primary-blue/20"
//                   >
//                     +
//                     <input
//                       id="tag-input"
//                       type="text"
//                       className="border-0 bg-transparent w-0 h-0 p-0"
//                       placeholder="tag"
//                     />
//                   </button>
//                 </div>
//               </div>
//             </div>
//             <div className="flex justify-end">
//               <button
//                 type="button"
//                 onClick={() => setShowAddModal(false)}
//                 className="px-3 py-1 text-text-muted rounded hover:bg-bg-surface/20 transition-colors"
//               >
//                 Cancel
//               </button>
//               <button
//                 type="submit"
//                 className="ml-3 px-4 py-2 bg-primary-blue text-white rounded hover:bg-primary-blue-dark transition-colors"
//                 disabled={!(newName.trim() && newAddress.trim() && isValidAddress(newAddress))}
//               >
//                 Add Address
//               </button>
//             </div>
//           </form>
//         </div>
//       </div>

//       {/* Edit Address Modal */}
//       <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 ${
//         showEditModal ? "block" : "hidden"
//       }`}>
//         <div className="bg-bg-base rounded-xl p-6 w-full max-w-md">
//           <h3 className="mb-4 font-display text-lg font-bold">Edit Address</h3>
//           <form onSubmit={(e) => {
//             e.preventDefault();
//             handleUpdateEntry();
//           }} className="space-y-4">
//             <div>
//               <label className="block text-xs font-medium mb-1">Name</label>
//               <input
//                 value={editName}
//                 onChange={(e) => setEditName(e.target.value)}
//                 placeholder="Enter a label for this address"
//                 required
//                 className="block w-full rounded-md border border-border bg-bg-base px-3 py-2 text-sm ring-1 ring-inset ring-text-muted/30 placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-0"
//               />
//             </div>
//             <div>
//               <label className="block text-xs font-medium mb-1">Address</label>
//               <input
//                 value={editAddress}
//                 onChange={(e) => setEditAddress(e.target.value)}
//                 placeholder="0x..."
//                 required
//                 className="block w-full rounded-md border border-border bg-bg-base px-3 py-2 text-sm ring-1 ring-inset ring-text-muted/30 placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-0"
//               />
//               {!isValidAddress(editAddress) && editAddress && (
//                 <p className="text-xs text-danger-red mt-1">
//                   Invalid Ethereum address
//                 </p>
//               )}
//             </div>
//             <div>
//               <label className="block text-xs font-medium mb-1">Tags (optional)</label>
//               <div className="flex flex-wrap gap-2 mb-2">
//                 {editTags.map((tag, index) => (
//                   <span
//                     key={index}
//                     className="flex items-center gap-1 px-2 py-0.5 bg-bg-surface/20 rounded text-xs"
//                   >
//                     {tag}
//                     <button
//                       type="button"
//                       onClick={() => {
//                         const newTagsCopy = [...editTags];
//                         newTagsCopy.splice(index, 1);
//                         setEditTags(newTagsCopy);
//                       }}
//                       className="text-text-muted/hover hover:text-text-danger"
//                     >
//                       ×
//                     </button>
//                   </span>
//                 ))}
//                 <div className="flex items-center gap-1">
//                   <button
//                     type="button"
//                     onClick={() => {
//                       const input = document.getElementById("edit-tag-input") as HTMLInputElement;
//                       const value = input?.value;
//                       if (value?.trim()) {
//                         setEditTags([
//                           ...editTags,
//                           value.trim().toLowerCase(),
//                         ]);
//                         input.value = "";
//                       }
//                     }}
//                     className="flex items-center gap-1 px-2 py-0.5 bg-primary-blue/10 text-primary-blue rounded hover:bg-primary-blue/20"
//                   >
//                     +
//                     <input
//                       id="edit-tag-input"
//                       type="text"
//                       className="border-0 bg-transparent w-0 h-0 p-0"
//                       placeholder="tag"
//                     />
//                   </button>
//                 </div>
//               </div>
//             </div>
//             <div className="flex justify-end">
//               <button
//                 type="button"
//                 onClick={() => {
//                   setShowEditModal(false);
//                   setEditEntryId(null);
//                   setEditName("");
//                   setEditAddress("");
//                   setEditTags([]);
//                 }}
//                 className="px-3 py-1 text-text-muted rounded hover:bg-bg-surface/20 transition-colors"
//               >
//                 Cancel
//               </button>
//               <button
//                 type="submit"
//                 className="ml-3 px-4 py-2 bg-primary-blue text-white rounded hover:bg-primary-blue-dark transition-colors"
//                 disabled={!(editName.trim() && editAddress.trim() && isValidAddress(editAddress))}
//               >
//                 Update Address
//               </button>
//             </div>
//           </form>
//         </div>
//       </div>

//       {/* Address List */}
//       {entries.length === 0 ? (
//         <p className="text-center py-8 text-text-muted">
//           No addresses in your address book. Add some to get started!
//         </p>
//       ) : (
//         <div className="divide-y divide-border">
//           {entries.map((entry) => (
//             <div key={entry.id} className="py-4">
//               <div className="flex items-center justify-between">
//                 <div className="flex items-center gap-3">
//                   <div className="flex-shrink-0">
//                     <span
//                       className={`text-xs font-bold rounded-full px-2 py-0.5 bg-primary-blue/10 text-primary-blue`}
//                     >
//                       #{entries.indexOf(entry) + 1}
//                     </span>
//                   </div>
//                   <div>
//                     <p className="text-sm font-medium text-text-primary">
//                       {entry.name}
//                     </p>
//                     <p className="text-xs text-muted truncate max-w-xs">
//                       {entry.address}
//                     </p>
//                     {entry.tags.length > 0 && (
//                       <div className="mt-1 flex flex-wrap gap-1">
//                         {entry.tags.map((tag) => (
//                           <span
//                             key={tag}
//                             className="px-2 py-0.5 rounded text-xs bg-bg-surface/20"
//                           >
//                             #{tag}
//                           </span>
//                         ))}
//                       </div>
//                     )}
//                   </div>
//                 </div>
//                 <div className="flex items-center gap-3">
//                   <button
//                     onClick={() => {
//                       setEditEntryId(entry.id);
//                       setEditName(entry.name);
//                       setEditAddress(entry.address);
//                       setEditTags([...entry.tags]);
//                       setShowEditModal(true);
//                     }}
//                     className="px-3 py-1 text-xs font-medium text-primary-blue hover:text-primary-blue/80"
//                   >
//                     Edit
//                   </button>
//                   <button
//                     onClick={() => handleRemoveEntry(entry.id)}
//                     className="px-3 py-1 text-xs font-medium text-danger-red hover:text-danger-red/80"
//                   >
//                     Remove
//                   </button>
//                   {userAddress &&
//                     entry.address.toLowerCase() === userAddress.toLowerCase() && (
//                       <button
//                         onClick={() => {
//                           // Copy to clipboard
//                           navigator.clipboard.writeText(entry.address);
//                           alert("Address copied to clipboard");
//                         }}
//                         className="px-3 py-1 text-xs font-medium text-success-green hover:text-success-green/80"
//                       >
//                         Copy
//                       </button>
//                     )}
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

import { useState } from "react";
import { useAddressBook } from "../lib/wallet/addressBook";
import { useAccount } from "wagmi";

interface AddressBookProps {
  className?: string;
}

export default function AddressBook({ className = "" }: AddressBookProps) {
  const { address: userAddress } = useAccount();
  const {
    entries,
    loading,
    error,
    addEntry,
    updateEntry,
    removeEntry,
    resetToDefaults,
    isValidAddress,
  } = useAddressBook();

  // State for modal/forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editEntryId, setEditEntryId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);

  const [newName, setNewName] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newTags, setNewTags] = useState<string[]>([]);

  // Handle adding new entry
  const handleAddEntry = async () => {
    if (!newName.trim() || !newAddress.trim()) {
      alert("Name and address are required");
      return;
    }

    if (!isValidAddress(newAddress)) {
      alert("Invalid Ethereum address");
      return;
    }

    try {
      await addEntry({
        name: newName.trim(),
        address: newAddress.trim() as `0x${string}`,
        tags: newTags.filter((tag) => tag.trim()).map((tag) => tag.trim()),
      });
      // Reset form
      setNewName("");
      setNewAddress("");
      setNewTags([]);
      setShowAddModal(false);
    } catch (err) {
      alert(`Failed to add address: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  // Handle updating entry
  const handleUpdateEntry = async () => {
    if (!editEntryId) return;
    if (!editName.trim() || !editAddress.trim()) {
      alert("Name and address are required");
      return;
    }

    if (!isValidAddress(editAddress)) {
      alert("Invalid Ethereum address");
      return;
    }

    try {
      await updateEntry(editEntryId, {
        name: editName.trim(),
        address: editAddress.trim() as `0x${string}`,
        tags: editTags.filter((tag) => tag.trim()).map((tag) => tag.trim()),
      });
      // Reset form
      setEditEntryId(null);
      setEditName("");
      setEditAddress("");
      setEditTags([]);
      setShowEditModal(false);
    } catch (err) {
      alert(`Failed to update address: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  // Handle removing entry
  const handleRemoveEntry = async (id: string) => {
    if (
      window.confirm(
        "Are you sure you want to remove this address from your address book?"
      )
    ) {
      try {
        await removeEntry(id);
      } catch (err) {
        alert(`Failed to remove address: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-text-muted">Loading address book...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-danger-red">
          Error loading address book: {
            error instanceof Error ? error.message : "Unknown error"
          }
        </p>
      </div>
    );
  }

  return (
    <div className={`${className} space-y-6`}>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Address Book</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-primary-blue/10 text-primary-blue rounded-md hover:bg-primary-blue/20 transition-colors"
          >
            + Add Address
          </button>
          <button
            onClick={resetToDefaults}
            className="px-4 py-2 bg-bg-surface/10 text-text-muted rounded-md hover:bg-bg-surface/20 transition-colors"
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Add Address Modal */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 ${
        showAddModal ? "block" : "hidden"
      }`}>
        <div className="bg-bg-base rounded-xl p-6 w-full max-w-md">
          <h3 className="mb-4 font-display text-lg font-bold">Add New Address</h3>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleAddEntry();
          }} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1">Name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Enter a label for this address"
                required
                className="block w-full rounded-md border border-border bg-bg-base px-3 py-2 text-sm ring-1 ring-inset ring-text-muted/30 placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Address</label>
              <input
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="0x..."
                required
                className="block w-full rounded-md border border-border bg-bg-base px-3 py-2 text-sm ring-1 ring-inset ring-text-muted/30 placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-0"
              />
              {!isValidAddress(newAddress) && newAddress && (
                <p className="text-xs text-danger-red mt-1">
                  Invalid Ethereum address
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Tags (optional)</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {newTags.map((tag, index) => (
                  <span
                    key={index}
                    className="flex items-center gap-1 px-2 py-0.5 bg-bg-surface/20 rounded text-xs"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => {
                        const newTagsCopy = [...newTags];
                        newTagsCopy.splice(index, 1);
                        setNewTags(newTagsCopy);
                      }}
                      className="text-text-muted/hover hover:text-text-danger"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById("tag-input") as HTMLInputElement;
                      const value = input?.value;
                      if (value?.trim()) {
                        setNewTags([
                          ...newTags,
                          value.trim().toLowerCase(),
                        ]);
                        input.value = "";
                      }
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 bg-primary-blue/10 text-primary-blue rounded hover:bg-primary-blue/20"
                  >
                    +
                    <input
                      id="tag-input"
                      type="text"
                      className="border-0 bg-transparent w-0 h-0 p-0"
                      placeholder="tag"
                    />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1 text-text-muted rounded hover:bg-bg-surface/20 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ml-3 px-4 py-2 bg-primary-blue text-white rounded hover:bg-primary-blue-dark transition-colors"
                disabled={!(newName.trim() && newAddress.trim() && isValidAddress(newAddress))}
              >
                Add Address
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Edit Address Modal */}
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 ${
        showEditModal ? "block" : "hidden"
      }`}>
        <div className="bg-bg-base rounded-xl p-6 w-full max-w-md">
          <h3 className="mb-4 font-display text-lg font-bold">Edit Address</h3>
          <form onSubmit={(e) => {
            e.preventDefault();
            handleUpdateEntry();
          }} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1">Name</label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter a label for this address"
                required
                className="block w-full rounded-md border border-border bg-bg-base px-3 py-2 text-sm ring-1 ring-inset ring-text-muted/30 placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Address</label>
              <input
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="0x..."
                required
                className="block w-full rounded-md border border-border bg-bg-base px-3 py-2 text-sm ring-1 ring-inset ring-text-muted/30 placeholder:text-text-muted/40 focus:outline-none focus:ring-2 focus:ring-primary-blue focus:ring-offset-0"
              />
              {!isValidAddress(editAddress) && editAddress && (
                <p className="text-xs text-danger-red mt-1">
                  Invalid Ethereum address
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Tags (optional)</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {editTags.map((tag, index) => (
                  <span
                    key={index}
                    className="flex items-center gap-1 px-2 py-0.5 bg-bg-surface/20 rounded text-xs"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => {
                        const newTagsCopy = [...editTags];
                        newTagsCopy.splice(index, 1);
                        setEditTags(newTagsCopy);
                      }}
                      className="text-text-muted/hover hover:text-text-danger"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById("edit-tag-input") as HTMLInputElement;
                      const value = input?.value;
                      if (value?.trim()) {
                        setEditTags([
                          ...editTags,
                          value.trim().toLowerCase(),
                        ]);
                        input.value = "";
                      }
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 bg-primary-blue/10 text-primary-blue rounded hover:bg-primary-blue/20"
                  >
                    +
                    <input
                      id="edit-tag-input"
                      type="text"
                      className="border-0 bg-transparent w-0 h-0 p-0"
                      placeholder="tag"
                    />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditEntryId(null);
                  setEditName("");
                  setEditAddress("");
                  setEditTags([]);
                }}
                className="px-3 py-1 text-text-muted rounded hover:bg-bg-surface/20 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="ml-3 px-4 py-2 bg-primary-blue text-white rounded hover:bg-primary-blue-dark transition-colors"
                disabled={!(editName.trim() && editAddress.trim() && isValidAddress(editAddress))}
              >
                Update Address
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Address List */}
      {entries.length === 0 ? (
        <p className="text-center py-8 text-text-muted">
          No addresses in your address book. Add some to get started!
        </p>
      ) : (
        <div className="divide-y divide-border">
          {entries.map((entry) => (
            <div key={entry.id} className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0">
                    <span
                      className={`text-xs font-bold rounded-full px-2 py-0.5 bg-primary-blue/10 text-primary-blue`}
                    >
                      #{entries.indexOf(entry) + 1}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {entry.name}
                    </p>
                    <p className="text-xs text-muted truncate max-w-xs">
                      {entry.address}
                    </p>
                    {entry.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {entry.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 rounded text-xs bg-bg-surface/20"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setEditEntryId(entry.id);
                      setEditName(entry.name);
                      setEditAddress(entry.address);
                      setEditTags([...entry.tags]);
                      setShowEditModal(true);
                    }}
                    className="px-3 py-1 text-xs font-medium text-primary-blue hover:text-primary-blue/80"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleRemoveEntry(entry.id)}
                    className="px-3 py-1 text-xs font-medium text-danger-red hover:text-danger-red/80"
                  >
                    Remove
                  </button>
                  {userAddress &&
                    entry.address.toLowerCase() === userAddress.toLowerCase() && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(entry.address);
                          alert("Address copied to clipboard");
                        }}
                        className="px-3 py-1 text-xs font-medium text-success-green hover:text-success-green/80"
                      >
                        Copy
                      </button>
                    )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}