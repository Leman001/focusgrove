/* App — lays all screens on the design canvas */
const W = 384, H = 832;

function App() {
  return (
    <DesignCanvas>
      <DCSection id="dash" title="Dashboard" subtitle="Hybrid — stats on top, quick-start below">
        <DCArtboard id="dash-a" label="A · Welcome & Trends" width={W} height={H}><DashboardA /></DCArtboard>
        <DCArtboard id="dash-b" label="B · Dial-forward" width={W} height={H}><DashboardB /></DCArtboard>
        <DCArtboard id="dash-c" label="C · Control panel" width={W} height={H}><DashboardC /></DCArtboard>
      </DCSection>

      <DCSection id="focus" title="Focus Mode" subtitle="Distraction-free — nav hidden">
        <DCArtboard id="focus-a" label="A · Zen ring" width={W} height={H}><FocusA /></DCArtboard>
        <DCArtboard id="focus-b" label="B · Growth orb" width={W} height={H}><FocusB /></DCArtboard>
        <DCArtboard id="focus-c" label="C · Control panel" width={W} height={H}><FocusC /></DCArtboard>
      </DCSection>

      <DCSection id="rewards" title="Rewards Store" subtitle="Spend focus minutes">
        <DCArtboard id="rew-a" label="A · Grid" width={W} height={H}><RewardsA /></DCArtboard>
        <DCArtboard id="rew-b" label="B · Featured goal" width={W} height={H}><RewardsB /></DCArtboard>
        <DCArtboard id="rew-c" label="C · List & progress" width={W} height={H}><RewardsC /></DCArtboard>
      </DCSection>

      <DCSection id="settings" title="Settings" subtitle="App configuration">
        <DCArtboard id="set-a" label="A · Grouped list" width={W} height={H}><SettingsA /></DCArtboard>
        <DCArtboard id="set-b" label="B · Card tiles" width={W} height={H}><SettingsB /></DCArtboard>
        <DCArtboard id="set-c" label="C · Minimal" width={W} height={H}><SettingsC /></DCArtboard>
      </DCSection>

      <DCSection id="modals" title="Modals" subtitle="Glass cards over a dimmed surface">
        <DCArtboard id="m-complete" label="Session complete" width={W} height={H}><ModalComplete /></DCArtboard>
        <DCArtboard id="m-add" label="Add reward" width={W} height={H}><ModalAddReward /></DCArtboard>
        <DCArtboard id="m-celebrate" label="Reward claimed" width={W} height={H}><ModalCelebrate /></DCArtboard>
        <DCArtboard id="m-warning" label="Distraction warning" width={W} height={H}><ModalWarning /></DCArtboard>
        <DCArtboard id="m-delete" label="Confirm delete" width={W} height={H}><ModalDelete /></DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
