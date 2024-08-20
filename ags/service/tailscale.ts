import { dependencies, sh, convertMapToObjDeeply } from "lib/utils"
import icons from "lib/icons.js"


if (!dependencies("tailscale"))
    App.quit()

class Tailscale extends Service {
    static {
        Service.register(this,{}, 
            {
                "exit_nodes": ["jsobject"],
                "selected_node": ["jsobject"],
                "enabled": ["boolean", "rw"],
                "icon_name": ["string"],
            }
        );
    }

    #exit_nodes: ExitNode[];
    #selected_node: ExitNode;
    #enabled: boolean;

    get exit_nodes() { return this.#exit_nodes }
    get selected_node() { return this.#selected_node } 
    get enabled() { return this.#enabled }

    get icon_name() {
        if (!this.#enabled) {
            return icons.tailscale.disabled;
        } else if (!this.#selected_node) {
            return icons.tailscale.enabled_sans_exit_node;
        }
        else {
            return icons.tailscale.enabled_with_exit_node;
        }
    }

    set selected_node(node) {
        const new_node = node?.ip || ""
        sh(`tailscale set --exit-node="${new_node}"`).then(() => {
            this.#selected_node = node
            this.#exit_nodes = this.#refresh_exit_nodes()
            this.changed("selected_node")
            this.changed("exit_nodes")
        })
    }

    set enabled(value) {
        if (value) {
            sh(`tailscale up`).then(() => {
                this.#enabled = value
                this.changed("enabled")
            })
        }
        else {
            sh(`tailscale down`).then(() => {
                this.#enabled = value
                this.changed("enabled")
            })
        }
    }

    #query_exit_nodes_command() {
        // TODO: refactor lol
        const tailscale = `tailscale exit-node list`
        const grep = `grep -v '^#' | grep -v '^$'`
        const sed = `sed 's/\\s\\{2,\\}/\\t/g;s/\\t$//;s/^\\s*//g'`
        const jq = `jq -c -Rn '[input | split("\\t") as $head | inputs | split("\\t") | with_entries(.key = $head[.key]) | with_entries(.key |= ascii_downcase)]'`
        return `${tailscale} | ${grep} | ${sed} | ${jq}`
    }

    #query_tailscale_status_command() {
        // TODO: refactor lol
        return "tailscale status | head -n 1"
    }

    #parse_status(output) {
        return !output.includes("Tailscale is stopped.")
    }

    #refresh_exit_nodes() {
        const out = Utils.exec(["bash", "-c", this.#query_exit_nodes_command()])
        return JSON.parse(out)
    }

    #find_selected_node(exit_nodes) {
        return this.#exit_nodes.find(node => node.status === "selected")
    }

    constructor() {
        super();

        this.#exit_nodes = this.#refresh_exit_nodes()
        this.#selected_node = this.#find_selected_node()

        const query_tailscale_status_command = this.#query_tailscale_status_command()
        Utils.execAsync(["bash", "-c", query_tailscale_status_command])
            .then(out => this.#enabled = this.#parse_status(out))
            .catch(err => print(err));
    }
}

interface ExitNode {
    ip: string
    hostname: string
    country: string
    city: string
    status: string
}

export const tailscale = await new Tailscale
