import { Menu, ArrowToggleButton } from "../ToggleButton"
import icons from "lib/icons.js"
import { dependencies, sh } from "lib/utils"
import options from "options"
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

export const NetworkIndicator = () => Widget.Icon().hook(network, self => {
    const icon = network[network.primary]?.icon_name
    self.icon = icon || ""
    self.visible = !!icon
})

export const NetworkToggle = () => NetworkToggleButton()

export const NetworkSelection = () => Menu({
    name: "network",
    icon: network.wifi.bind("icon_name"),
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
                                    Utils.execAsync(`nmcli device network.wifi connect ${ap.bssid}`)
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
