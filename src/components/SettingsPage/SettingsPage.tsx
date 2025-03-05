import { ChangePasswordPopup } from '../SavedWalletsList/ChangePasswordPopup'
import NetworkSettings from './NetworkSettings'
import ExtraCurrencySettings from './ExtraCurrencySettings'
import AddressBookSettings from './AddressBookSettings'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faNetworkWired,
  faDollarSign,
  faGear,
  faShieldHalved,
  faAddressBook,
} from '@fortawesome/free-solid-svg-icons'
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { cn } from '@/utils/cn'

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('security')

  return (
    <div className="container mx-auto py-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center mb-8 space-x-4">
        <div className="bg-primary/10 p-3 rounded-full">
          <FontAwesomeIcon icon={faGear} className="text-2xl text-primary" />
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your application preferences and wallet settings
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b">
          <TabsList className="bg-transparent h-auto p-0 mb-0 w-full justify-start">
            {/* Commenting out General tab
            <TabsTrigger
              value="general"
              className={cn(
                'rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3 px-6',
                activeTab === 'general' && 'text-primary font-medium'
              )}
            >
              <FontAwesomeIcon icon={faGear} className="mr-2" />
              General
            </TabsTrigger>
            */}
            <TabsTrigger
              value="security"
              className={cn(
                'rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3 px-6',
                activeTab === 'security' && 'text-primary font-medium'
              )}
            >
              <FontAwesomeIcon icon={faShieldHalved} className="mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger
              value="networks"
              className={cn(
                'rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3 px-6',
                activeTab === 'networks' && 'text-primary font-medium'
              )}
            >
              <FontAwesomeIcon icon={faNetworkWired} className="mr-2" />
              Networks
            </TabsTrigger>
            <TabsTrigger
              value="currencies"
              className={cn(
                'rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3 px-6',
                activeTab === 'currencies' && 'text-primary font-medium'
              )}
            >
              <FontAwesomeIcon icon={faDollarSign} className="mr-2" />
              Currencies
            </TabsTrigger>
            <TabsTrigger
              value="address-book"
              className={cn(
                'rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none data-[state=active]:bg-transparent py-3 px-6',
                activeTab === 'address-book' && 'text-primary font-medium'
              )}
            >
              <FontAwesomeIcon icon={faAddressBook} className="mr-2" />
              Address Book
            </TabsTrigger>
          </TabsList>
        </div>

        {/* General Settings Tab - Commented out
        <TabsContent value="general" className="pt-6">
          <Card>
            <CardHeader className="border-b bg-muted/30 pt-6 pb-6">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faGear} className="text-primary" />
                <div>
                  <CardTitle className="text-lg">General Settings</CardTitle>
                  <CardDescription>Configure basic application settings</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-muted-foreground">
                No general settings are available at this time.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        */}

        {/* Security Settings Tab */}
        <TabsContent value="security" className="pt-6">
          <Card className="border shadow overflow-hidden">
            <CardHeader className="border-b bg-muted/30 pt-6 pb-6">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faShieldHalved} className="text-primary" />
                <div>
                  <CardTitle className="text-lg">Password Settings</CardTitle>
                  <CardDescription>Manage your account password</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <ChangePasswordPopup />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Networks Settings Tab */}
        <TabsContent value="networks" className="pt-6">
          <NetworkSettings />
        </TabsContent>

        {/* Currencies Settings Tab */}
        <TabsContent value="currencies" className="pt-6">
          <ExtraCurrencySettings />
        </TabsContent>

        {/* Address Book Tab */}
        <TabsContent value="address-book" className="pt-6">
          <AddressBookSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
