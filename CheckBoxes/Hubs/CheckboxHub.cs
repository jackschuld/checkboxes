using Microsoft.AspNetCore.SignalR;
using System.Collections;
using System;
using System.IO;
using System.Threading;

public class CheckboxHub : Hub
{
    // 1 million checkboxes
    private static readonly int CheckboxCount = 1_000_000;
    private static readonly BitArray State = new BitArray(CheckboxCount);
    private static readonly object LockObj = new object();
    private static readonly string StateFile = "checkbox_state.bin";
    private static Timer? SaveTimer;

    static CheckboxHub()
    {
        // Load state from file if it exists
        if (File.Exists(StateFile))
        {
            byte[] bytes = File.ReadAllBytes(StateFile);
            if (bytes.Length == (CheckboxCount + 7) / 8)
            {
                State = new BitArray(bytes);
            }
        }
        // Start periodic save timer (every 10 seconds)
        SaveTimer = new Timer(_ => SaveState(), null, 10000, 10000);
    }

    private static void SaveState()
    {
        lock (LockObj)
        {
            byte[] bytes = new byte[(CheckboxCount + 7) / 8];
            State.CopyTo(bytes, 0);
            File.WriteAllBytes(StateFile, bytes);
        }
    }

    public override async Task OnConnectedAsync()
    {
        // Send the full state as a byte array (compressed)
        byte[] bytes = new byte[(CheckboxCount + 7) / 8];
        lock (LockObj)
        {
            State.CopyTo(bytes, 0);
        }
        await Clients.Caller.SendAsync("FullState", Convert.ToBase64String(bytes));
        await base.OnConnectedAsync();
    }

    public async Task ToggleCheckbox(int index, bool isChecked)
    {
        lock (LockObj)
        {
            State.Set(index, isChecked);
        }
        // Broadcast to all other users
        await Clients.Others.SendAsync("CheckboxToggled", index, isChecked);
    }
}
