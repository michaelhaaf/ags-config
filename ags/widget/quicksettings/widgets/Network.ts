import { Menu, ArrowToggleButton } from "../ToggleButton"
import icons from "lib/icons.js"
import { dependencies, sh, convertMapToObjDeeply } from "lib/utils"
import options from "options"
import { tailscale } from "service/tailscale"
const network = await Service.import("network")

const NetworkToggleButton = () => ArrowToggleButton({
    name: "network",
    icon: network[network.primary]?.icon_name || "",
    label: network[network.primary]?.bind("ssid")?.as(ssid => ssid || "Ethernet"),
    connection: [network.wifi, () => network.wifi.enabled],
    deactivate: () => network.wifi.enabled = false,
    activate: () => {
        network.wifi.enabled = true
        network.wifi.scan()
    },
})

const TailscaleToggleButton = () => ArrowToggleButton({
    name: "tailscale",
    icon: tailscale.icon_name || "",
    label: "Tailscale",
    connection: [tailscale, () => tailscale.enabled],
    deactivate: () => {
        tailscale.enabled = false;
    },
    activate: () => {
        tailscale.enabled = true;
    },
})

export const NetworkIndicator = () => Widget.Icon().hook(network, self => {
    const icon = network[network.primary]?.icon_name
    self.icon = icon || ""
    self.visible = !!icon
})

export const TailscaleIndicator = () => Widget.Icon().hook(tailscale, self => {
    const icon = tailscale.icon_name
    self.icon = icon || ""
    self.visible = !!icon
})

export const NetworkToggle = () => NetworkToggleButton()

export const TailscaleToggle = () => TailscaleToggleButton()

export const NetworkSelection = () => Menu({
    name: "network",
    icon: network[network.primary]?.bind("icon_name"),
    title: "Network Selection",
    content: [
        Widget.Button({
            on_clicked: () => sh(options.quicksettings.networkSettings.value),
            child: Widget.Box({
                children: [
                    Widget.Icon(icons.ui.settings),
                    Widget.Label("Network Settings"),
                ],
            }),
        }),
        Widget.Separator(),
        Widget.Scrollable({
            hscroll: "never",
            vscroll: "automatic",
            setup: self => self.set_size_request(-1, 300),
            child: Widget.Box({
                vertical: true,
                setup: self => self.hook(network.wifi, () => self.children =
                    network.wifi.access_points
                        .filter((ap, index, self) =>
                            index === self.findIndex(elem => (elem.ssid === ap.ssid)))
                        .sort((x, y) => y.strength - x.strength)
                        .map(ap => Widget.Button({
                            on_clicked: () => {
                                if (dependencies("nmcli"))
                                    Utils.execAsync(`nmcli device wifi connect ${ap.bssid}`)
                            },
                            child: Widget.Box({
                                children: [
                                    Widget.Icon(ap.iconName),
                                    Widget.Label(ap.ssid || ""),
                                    Widget.Icon({
                                        icon: icons.ui.tick,
                                        hexpand: true,
                                        hpack: "end",
                                        setup: self => Utils.idle(() => {
                                            if (!self.is_destroyed)
                                                self.visible = ap.active
                                        }),
                                    }),
                                ],
                            }),
                        })),
                ),
            }),
        }),
    ],
})

export const TailscaleSelection = () => Menu({
    name: "tailscale",
    icon: "",
    title: "Exit Node Selection",
    content: [
        Widget.Button({
            on_clicked: () => tailscale.selected_node = undefined,
            child: Widget.Box({
                children: [
                    Widget.Icon(icons.tailscale.enabled_sans_exit_node),
                    Widget.Label("Turn exit node off"),
                ],
            }),
        }),
        Widget.Separator(),
        Widget.Scrollable({
            hscroll: "never",
            vscroll: "automatic",
            setup: self => self.set_size_request(-1, 300),
            child: Widget.Box({
                vertical: true,
                setup: self => self.hook(tailscale, () => self.children =
                    tailscale.exit_nodes
                        .map(node => Widget.Button({
                            on_clicked: () => tailscale.selected_node = node,
                            child: Widget.Box({
                                children: [
                                    Widget.Icon(icons.tailscale.enabled_with_exit_node),
                                    Widget.Label(`${node.country} (${node.hostname})` || ""),
                                    Widget.Icon({
                                        icon: icons.ui.tick,
                                        hexpand: true,
                                        hpack: "end",
                                        setup: self => Utils.idle(() => {
                                            if (!self.is_destroyed)
                                                self.visible = node.status === "selected"
                                        }),
                                    }),
                                ],
                            }),
                        })),
                ),
            }),
        }),
    ],
})
