import * as vscode from 'vscode';
import {
	IBucket,
	IObject,
    DataManagementClient,
    DesignAutomationClient,
    DesignAutomationID
} from 'forge-nodejs-utils';

type SimpleStorageEntry = IBucket | IObject;

function isBucket(entry: SimpleStorageEntry): entry is IBucket {
    return (<IBucket>entry).policyKey !== undefined;
}

function isObject(entry: SimpleStorageEntry): entry is IObject {
    return (<IObject>entry).objectId !== undefined;
}

export class SimpleStorageDataProvider implements vscode.TreeDataProvider<SimpleStorageEntry> {
    private _client: DataManagementClient;
    private _onDidChangeTreeData: vscode.EventEmitter<SimpleStorageEntry | null> = new vscode.EventEmitter<SimpleStorageEntry | null>();

	readonly onDidChangeTreeData?: vscode.Event<SimpleStorageEntry | null> = this._onDidChangeTreeData.event;

    constructor(client: DataManagementClient) {
        this._client = client;
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: SimpleStorageEntry): vscode.TreeItem | Thenable<vscode.TreeItem> {
        if (isBucket(element)) {
            const node = new vscode.TreeItem(element.bucketKey, vscode.TreeItemCollapsibleState.Collapsed);
            node.contextValue = 'bucket';
            return node;
        } else {
            const node = new vscode.TreeItem(element.objectKey, vscode.TreeItemCollapsibleState.None);
            node.contextValue = 'object';
            return node;
        }
    }

    async getChildren(element?: SimpleStorageEntry | undefined): Promise<SimpleStorageEntry[]> {
        try {
            if (element && isBucket(element)) {
                const objects = await this._client.listObjects(element.bucketKey);
                return objects;
            } else {
                const buckets = await this._client.listBuckets();
                return buckets;
            }
        } catch(err) {
            vscode.window.showErrorMessage('Could not load objects or buckets: ' + JSON.stringify(err));
        }
        return [];
    }
}

interface IDesignAutomationEntry {
    label: string;
}

export interface IOwnedAppBundlesEntry extends IDesignAutomationEntry {
    type: 'owned-appbundles';
}

export interface ISharedAppBundlesEntry extends IDesignAutomationEntry {
    type: 'shared-appbundles';
}

export interface IAppBundleEntry extends IDesignAutomationEntry {
    type: 'appbundle';
    client: string;
    appbundle: string;
}

export interface IAppBundleAliasesEntry extends IDesignAutomationEntry {
    type: 'appbundle-aliases';
    client: string;
    appbundle: string;
}

export interface IAppBundleAliasEntry extends IDesignAutomationEntry {
    type: 'appbundle-alias';
    client: string;
    appbundle: string;
    alias: string;
}

export interface IAppBundleVersionsEntry extends IDesignAutomationEntry {
    type: 'appbundle-versions';
    client: string;
    appbundle: string;
}

export interface IAppBundleVersionEntry extends IDesignAutomationEntry {
    type: 'appbundle-version';
    client: string;
    appbundle: string;
    version: number;
}

export interface IOwnedActivitiesEntry extends IDesignAutomationEntry {
    type: 'owned-activities';
}

export interface ISharedActivitiesEntry extends IDesignAutomationEntry {
    type: 'shared-activities';
}

export interface IActivityEntry extends IDesignAutomationEntry {
    type: 'activity';
    client: string;
    activity: string;
}

export interface IActivityAliasesEntry extends IDesignAutomationEntry {
    type: 'activity-aliases';
    client: string;
    activity: string;
}

export interface IActivityAliasEntry extends IDesignAutomationEntry {
    type: 'activity-alias';
    client: string;
    activity: string;
    alias: string;
}

export interface IActivityVersionsEntry extends IDesignAutomationEntry {
    type: 'activity-versions';
    client: string;
    activity: string;
}

export interface IActivityVersionEntry extends IDesignAutomationEntry {
    type: 'activity-version';
    client: string;
    activity: string;
    version: number;
}

type DesignAutomationEntry =
    | IOwnedAppBundlesEntry | ISharedAppBundlesEntry | IAppBundleEntry | IAppBundleAliasesEntry | IAppBundleAliasEntry | IAppBundleVersionsEntry | IAppBundleVersionEntry
    | IOwnedActivitiesEntry | ISharedActivitiesEntry | IActivityEntry | IActivityAliasesEntry | IActivityAliasEntry | IActivityVersionsEntry | IActivityVersionEntry;

export class DesignAutomationDataProvider implements vscode.TreeDataProvider<DesignAutomationEntry> {
    private _client: DesignAutomationClient;
    private _clientId: string;
    private _onDidChangeTreeData: vscode.EventEmitter<DesignAutomationEntry | null> = new vscode.EventEmitter<DesignAutomationEntry | null>();

	readonly onDidChangeTreeData?: vscode.Event<DesignAutomationEntry | null> = this._onDidChangeTreeData.event;

    constructor(client: DesignAutomationClient, clientId: string) {
        this._client = client;
        this._clientId = clientId;
    }

    refresh() {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: DesignAutomationEntry): vscode.TreeItem | Thenable<vscode.TreeItem> {
        let node: vscode.TreeItem;
        switch (element.type) {
            case 'owned-appbundles':
            case 'shared-appbundles':
            case 'appbundle':
            case 'appbundle-aliases':
            case 'appbundle-versions':
            case 'owned-activities':
            case 'shared-activities':
            case 'activity':
            case 'activity-aliases':
            case 'activity-versions':
                node = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.Collapsed);
                break;
            case 'appbundle-alias':
            case 'appbundle-version':
            case 'activity-alias':
            case 'activity-version':
                node = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
                break;
            default:
                throw new Error('Unexpected entry type'); // Should never be hit
        }
        node.contextValue = element.type;
        return node;
    }

    async getChildren(element?: DesignAutomationEntry | undefined): Promise<DesignAutomationEntry[]> {
        if (!element) {
            return [
                { type: 'owned-appbundles', label: 'Owned App Bundles' },
                { type: 'shared-appbundles', label: 'Shared App Bundles' },
                { type: 'owned-activities', label: 'Owned Activities' },
                { type: 'shared-activities', label: 'Shared Activities' }
            ];
        } else {
            switch (element.type) {
                case 'owned-appbundles':
                    return this._getOwnedAppBundles(element);
                case 'shared-appbundles':
                    return this._getSharedAppBundles(element);
                case 'appbundle':
                    return this._getAppBundleChildren(element);
                case 'appbundle-aliases':
                    return this._getAppBundleAliases(element);
                case 'appbundle-versions':
                    return this._getAppBundleVersions(element);
                case 'owned-activities':
                    return this._getOwnedActivities(element);
                case 'shared-activities':
                    return this._getSharedActivities(element);
                case 'activity':
                    return this._getActivityChildren(element);
                case 'activity-aliases':
                    return this._getActivityAliases(element);
                case 'activity-versions':
                    return this._getActivityVersions(element);
                default:
                    throw new Error('Unexpected entry type'); // Should never be hit
            }
        }
    }

    private async _getOwnedAppBundles(entry: IOwnedAppBundlesEntry): Promise<IAppBundleEntry[]> {
        const appBundleIDs = await this._client.listAppBundles();
        const filteredIDs = appBundleIDs.map(DesignAutomationID.parse).filter(item => item !== null && item.owner === this._clientId) as DesignAutomationID[];
        const uniqueIDs = new Set(filteredIDs.map(item => item.id));
        return Array.from(uniqueIDs.values()).map(appbundle => ({ type: 'appbundle', client: this._clientId, appbundle: appbundle, label: appbundle }));
    }

    private async _getSharedAppBundles(entry: ISharedAppBundlesEntry): Promise<IAppBundleAliasEntry[]> {
        const appBundleIDs = await this._client.listAppBundles();
        const filteredIDs = appBundleIDs.map(DesignAutomationID.parse).filter(item => item !== null && item.owner !== this._clientId) as DesignAutomationID[];
        return filteredIDs.map(id => ({ type: 'appbundle-alias', client: id.owner, appbundle: id.id, alias: id.alias, label: id.toString() }));
    }

    private async _getAppBundleChildren(entry: IAppBundleEntry): Promise<(IAppBundleAliasesEntry | IAppBundleVersionsEntry)[]> {
        return [
            { type: 'appbundle-aliases', client: entry.client, appbundle: entry.appbundle, label: 'Aliases' },
            { type: 'appbundle-versions', client: entry.client, appbundle: entry.appbundle, label: 'Versions' }
        ];
    }

    private async _getAppBundleAliases(entry: IAppBundleAliasesEntry): Promise<IAppBundleAliasEntry[]> {
        const aliases = await this._client.listAppBundleAliases(entry.appbundle);
        return aliases
            .filter(alias => alias.id !== '$LATEST')
            .map(alias => ({ type: 'appbundle-alias', client: entry.client, appbundle: entry.appbundle, alias: alias.id, label: alias.id }));
    }

    private async _getAppBundleVersions(entry: IAppBundleVersionsEntry): Promise<IAppBundleVersionEntry[]> {
        const versions = await this._client.listAppBundleVersions(entry.appbundle);
        return versions.map(version => ({ type: 'appbundle-version', client: entry.client, appbundle: entry.appbundle, version: version, label: version.toString() }));
    }

    private async _getOwnedActivities(entry: IOwnedActivitiesEntry): Promise<IActivityEntry[]> {
        const activityIDs = await this._client.listActivities();
        const filteredIDs = activityIDs.map(DesignAutomationID.parse).filter(item => item !== null && item.owner === this._clientId) as DesignAutomationID[];
        const uniqueIDs = new Set<string>(filteredIDs.map(id => id.id));
        return Array.from(uniqueIDs.values()).map(activity => ({ type: 'activity', client: this._clientId, activity: activity, label: activity }));
    }

    private async _getSharedActivities(entry: ISharedActivitiesEntry): Promise<IActivityAliasEntry[]> {
        const activityIDs = await this._client.listActivities();
        const filteredIDs = activityIDs.map(DesignAutomationID.parse).filter(item => item !== null && item.owner !== this._clientId) as DesignAutomationID[];
        return filteredIDs.map(id => ({ type: 'activity-alias', client: id.owner, activity: id.id, alias: id.alias, label: id.toString() }));
    }

    private async _getActivityChildren(entry: IActivityEntry): Promise<(IActivityAliasesEntry | IActivityVersionsEntry)[]> {
        return [
            { type: 'activity-aliases', client: entry.client, activity: entry.activity, label: 'Aliases' },
            { type: 'activity-versions', client: entry.client, activity: entry.activity, label: 'Versions' }
        ];
    }

    private async _getActivityAliases(entry: IActivityAliasesEntry): Promise<DesignAutomationEntry[]> {
        const aliases = await this._client.listActivityAliases(entry.activity);
        return aliases
            .filter(alias => alias.id !== '$LATEST')
            .map(alias => ({ type: 'activity-alias', client: entry.client, activity: entry.activity, alias: alias.id, label: alias.id }));
    }

    private async _getActivityVersions(entry: IActivityVersionsEntry): Promise<DesignAutomationEntry[]> {
        const versions = await this._client.listActivityVersions(entry.activity);
        return versions.map(version => ({ type: 'activity-version', client: entry.client, activity: entry.activity, version: version, label: version.toString() }));
    }
}